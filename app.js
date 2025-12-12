
// Global variables
let scene, camera, renderer;
let motifMeshes = [];
let raycaster, mouse;
let targetPosition = { x: 0, y: 0, z: 8 };
let isAnimating = false;
let container;
let loadedTexturesCount = 0;
let totalTextures = motifData.length;

// DOM elements
const loadingEl = document.getElementById('loading');
const descriptionPanel = document.getElementById('description-panel');
const motifNameEl = document.getElementById('motif-name');
const motifDescriptionEl = document.getElementById('motif-description');
const colorBoxEl = document.getElementById('color-box');

// Initialize the scene
function init() {
  container = document.getElementById('container');

  // Setup Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // Setup Camera
  camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 8);

  // Setup Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Setup Raycaster
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Add Lighting
  setupLighting();

  // Create motif planes
  createMotifPlanes();

  // Add event listeners
  container.addEventListener('click', onMouseClick);
  container.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', onWindowResize);

  // Start animation
  animate();
}

// Setup lighting
function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 0.8);
  pointLight.position.set(5, 5, 5);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0xffffff, 0.4);
  pointLight2.position.set(-5, -5, 5);
  scene.add(pointLight2);
}

// Create texture from image file
function createTexture(motif) {
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(
    motif.imageUrl,
    // onLoad callback
    function (loadedTexture) {
      loadedTexture.needsUpdate = true;
      loadedTexturesCount++;
      loadingEl.textContent = `Memuat galeri... ${loadedTexturesCount}/${totalTextures}`;

      // Hide loading screen when all textures are loaded
      if (loadedTexturesCount >= totalTextures) {
        setTimeout(() => {
          loadingEl.classList.add('hidden');
        }, 300);
      }
    },
    // onProgress callback (optional)
    undefined,
    // onError callback
    function (err) {
      console.error('Error loading texture:', motif.imageUrl, err);
      loadedTexturesCount++;
      if (loadedTexturesCount >= totalTextures) {
        loadingEl.classList.add('hidden');
      }
    }
  );

  // Set texture properties for better quality
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  return texture;
}

// Create motif planes with frames
function createMotifPlanes() {
  const cols = 3;
  const rows = 2;
  const spacing = 3;

  motifData.forEach((motif, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    // Create plane with texture
    const texture = createTexture(motif);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);

    // Position
    mesh.position.x = (col - 1) * spacing;
    mesh.position.y = (0.5 - row) * spacing;
    mesh.position.z = 0;

    // Store motif data
    mesh.userData = motif;

    // Create frame
    const frameGeometry = new THREE.BoxGeometry(2.2, 2.2, 0.1);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      metalness: 0.3,
      roughness: 0.7
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.copy(mesh.position);
    frame.position.z = -0.1;

    scene.add(frame);
    scene.add(mesh);
    motifMeshes.push(mesh);
  });
}

// Mouse click handler
function onMouseClick(event) {
  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(motifMeshes);

  if (intersects.length > 0) {
    const selected = intersects[0].object;
    showMotifDescription(selected.userData);

    // Zoom to selected motif
    targetPosition = {
      x: selected.position.x,
      y: selected.position.y,
      z: 4
    };
    isAnimating = true;
  } else {
    // Zoom out
    targetPosition = { x: 0, y: 0, z: 8 };
    isAnimating = true;
    hideMotifDescription();
  }
}

// Mouse move handler for hover effect
function onMouseMove(event) {
  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(motifMeshes);

  // Reset all scales
  motifMeshes.forEach(mesh => {
    mesh.scale.set(1, 1, 1);
  });

  // Highlight hovered motif
  if (intersects.length > 0) {
    intersects[0].object.scale.set(1.1, 1.1, 1.1);
    container.style.cursor = 'pointer';
  } else {
    container.style.cursor = 'default';
  }
}

// Show motif description
function showMotifDescription(motif) {
  motifNameEl.textContent = motif.name;
  motifDescriptionEl.textContent = motif.description;
  colorBoxEl.style.backgroundColor = motif.color;
  descriptionPanel.classList.add('visible');
}

// Hide motif description
function hideMotifDescription() {
  descriptionPanel.classList.remove('visible');
}

// Window resize handler
function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Smooth camera movement
  if (isAnimating) {
    camera.position.x += (targetPosition.x - camera.position.x) * 0.1;
    camera.position.y += (targetPosition.y - camera.position.y) * 0.1;
    camera.position.z += (targetPosition.z - camera.position.z) * 0.1;

    if (Math.abs(camera.position.z - targetPosition.z) < 0.01) {
      isAnimating = false;
    }
  }

  // Rotate motifs slightly
  motifMeshes.forEach((mesh, index) => {
    mesh.rotation.z = Math.sin(Date.now() * 0.001 + index) * 0.02;
  });

  camera.lookAt(targetPosition.x, targetPosition.y, 0);
  renderer.render(scene, camera);
}

// Start the application
init();