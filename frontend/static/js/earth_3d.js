/**
 * Smart Drainage & Waterlogging - 3D Earth Globe Visual
 * Uses Three.js with custom procedural geospatial texturing,
 * India & Andhra Pradesh highlights, Guntur location pin,
 * 3D orbiting satellite, holographic scanning cone, atmospheric Fresnel glow,
 * and realistic cloud animations.
 */

class Earth3DVisual {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.globe = null;
    this.cloudLayer = null;
    this.atmosphere = null;
    this.satelliteGroup = null;
    this.scanBeam = null;
    this.orbitRadius = 4.8;
    this.globeRadius = 3.6;
    this.orbitAngle = 0.35;
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.targetRotation = { x: 0.22, y: 3.05 }; // Center India / Andhra Pradesh
    this.currentRotation = { x: 0.22, y: 3.05 };
    this.autoRotate = true;
    this.autoRotateSpeed = 0.0003;
    this.pulseTime = 0;
    this.pulseRings = [];

    this.init();
  }

  init() {
    // 1. Scene Setup
    this.scene = new THREE.Scene();

    // 2. Camera Setup
    this.camera = new THREE.PerspectiveCamera(
      42,
      this.width / this.height,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 10.2);

    // 3. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    this.setupLighting();

    // 5. Globe with Procedural GIS Texture
    this.createGlobe();

    // 6. Atmospheric Rim Glow (Fresnel Shader)
    this.createAtmosphere();

    // 7. Rotating Cloud Layer
    this.createClouds();

    // 8. India, Andhra Pradesh & Guntur Highlights
    this.createGeospatialHighlights();

    // 9. Orbiting 3D Satellite & Scanning Hologram
    this.createSatelliteSystem();

    // 10. Starfield Background Particle Dust
    this.createSpaceParticles();

    // 11. Event Listeners
    this.setupEvents();

    // 12. Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    // Primary Sunlight illuminating India
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    sunLight.position.set(8, 4, 10);
    this.scene.add(sunLight);

    // Ambient Space Light with Electric Blue Tone
    const ambientLight = new THREE.AmbientLight(0x0a2550, 0.95);
    this.scene.add(ambientLight);

    // Deep Cyan Rim Light
    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 1.4);
    cyanRim.position.set(-10, -5, -4);
    this.scene.add(cyanRim);
  }

  generateProceduralEarthTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    // Deep Ocean Background with Bathymetric Gradients
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    oceanGrad.addColorStop(0, "#03142e");
    oceanGrad.addColorStop(0.5, "#082852");
    oceanGrad.addColorStop(1, "#020f24");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lat/Lon Grid Lines (Subtle GIS Telemetry)
    ctx.strokeStyle = "rgba(0, 240, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let lat = 0; lat <= canvas.height; lat += canvas.height / 12) {
      ctx.beginPath();
      ctx.moveTo(0, lat);
      ctx.lineTo(canvas.width, lat);
      ctx.stroke();
    }
    for (let lon = 0; lon <= canvas.width; lon += canvas.width / 24) {
      ctx.beginPath();
      ctx.moveTo(lon, 0);
      ctx.lineTo(lon, canvas.height);
      ctx.stroke();
    }

    // Equator & Tropics highlight
    ctx.strokeStyle = "rgba(0, 240, 255, 0.18)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Helper: Project Lon/Lat to Canvas coordinates
    const toXY = (lon, lat) => {
      const x = ((lon + 180) / 360) * canvas.width;
      const y = ((90 - lat) / 180) * canvas.height;
      return { x, y };
    };

    // Helper to draw continent landmass
    const drawLand = (coords, fillColor, strokeColor) => {
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor || "rgba(0, 240, 255, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      coords.forEach((pt, i) => {
        const { x, y } = toXY(pt[0], pt[1]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    const landColor = "#113824"; // Forest dark green
    const landStroke = "rgba(34, 197, 94, 0.4)";

    // Africa
    drawLand([
      [-17, 15], [-5, 36], [10, 37], [25, 32], [32, 30],
      [43, 12], [51, 12], [40, -10], [35, -20], [28, -34],
      [18, -34], [12, -15], [9, 5], [-17, 15]
    ], landColor, landStroke);

    // Europe
    drawLand([
      [-9, 36], [2, 48], [15, 55], [25, 60], [30, 70],
      [50, 68], [60, 55], [40, 45], [25, 38], [-5, 36]
    ], "#1a4731", landStroke);

    // Asia (excluding India region)
    drawLand([
      [40, 45], [60, 55], [80, 65], [110, 70], [140, 65],
      [145, 45], [130, 35], [120, 22], [105, 10], [100, 20],
      [90, 24], [75, 35], [60, 35], [50, 30], [40, 45]
    ], "#16452e", landStroke);

    // Americas (simplified)
    drawLand([
      [-160, 70], [-130, 55], [-120, 35], [-100, 20], [-80, 8],
      [-75, -10], [-70, -35], [-65, -55], [-50, -30], [-35, -5],
      [-50, 5], [-75, 12], [-80, 25], [-70, 45], [-60, 60],
      [-90, 70], [-130, 75], [-160, 70]
    ], landColor, landStroke);

    // Australia
    drawLand([
      [115, -22], [125, -15], [140, -15], [150, -25], [150, -38],
      [135, -35], [115, -34], [115, -22]
    ], landColor, landStroke);

    // ==========================================
    // PROMINENT INDIAN SUBCONTINENT
    // ==========================================
    // India Perimeter
    const indiaCoords = [
      [68.5, 23.5], [70.5, 21.0], [72.8, 19.0], [74.0, 15.5],
      [75.5, 12.5], [77.5, 8.2], [79.8, 9.8], [80.3, 13.0],
      [80.5, 16.3], [82.5, 17.0], [84.5, 19.0], [87.0, 21.5],
      [88.5, 22.0], [89.0, 25.5], [92.5, 25.0], [95.0, 28.0],
      [96.5, 28.5], [94.0, 29.5], [89.0, 27.5], [85.0, 27.5],
      [81.0, 30.0], [78.5, 32.0], [75.0, 34.5], [74.0, 36.5],
      [73.0, 34.0], [71.5, 30.0], [69.0, 27.0], [68.5, 23.5]
    ];

    // India base landmass with lush topographic gradient
    const indStart = toXY(77, 8);
    const indEnd = toXY(77, 36);
    const indiaGrad = ctx.createLinearGradient(indStart.x, indStart.y, indEnd.x, indEnd.y);
    indiaGrad.addColorStop(0, "#059669"); // Southern lush green
    indiaGrad.addColorStop(0.4, "#10b981"); // Deccan plateau vibrant green
    indiaGrad.addColorStop(0.7, "#0d9488"); // Gangetic plains teal/green
    indiaGrad.addColorStop(1, "#0284c7"); // Himalayan foothills blue

    ctx.fillStyle = indiaGrad;
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    indiaCoords.forEach((pt, i) => {
      const { x, y } = toXY(pt[0], pt[1]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();

    // Glowing Neon National Boundary Outline
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 3.5;
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // ==========================================
    // HIGHLIGHT: ANDHRA PRADESH STATE
    // ==========================================
    const apCoords = [
      [77.0, 14.5], [78.0, 13.6], [79.5, 13.0], [80.2, 13.5],
      [80.4, 15.8], [80.5, 16.3], [82.0, 17.0], [83.3, 17.8],
      [84.5, 19.0], [83.5, 18.5], [82.0, 18.0], [80.5, 17.5],
      [79.5, 16.0], [78.5, 15.8], [77.5, 15.0], [77.0, 14.5]
    ];

    ctx.fillStyle = "rgba(0, 245, 212, 0.45)"; // Glowing cyan/teal overlay
    ctx.shadowColor = "#00f5d4";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    apCoords.forEach((pt, i) => {
      const { x, y } = toXY(pt[0], pt[1]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#00f5d4";
    ctx.lineWidth = 3;
    ctx.stroke();

    // ==========================================
    // HIGHLIGHT: GUNTUR LOCATION PIN
    // ==========================================
    const guntur = toXY(80.4365, 16.3067);

    // Glowing Red Location Pin on Texture
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "#ff0033";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(guntur.x, guntur.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Pin Center Dot
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(guntur.x, guntur.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Pulse Ring on Texture
    ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(guntur.x, guntur.y, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  createGlobe() {
    const geometry = new THREE.SphereGeometry(this.globeRadius, 64, 64);
    const earthTexture = this.generateProceduralEarthTexture();

    // Material with subtle gloss and specular ocean reflections
    const material = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: 28,
      specular: new THREE.Color(0x38bdf8),
      emissive: new THREE.Color(0x021633),
      emissiveIntensity: 0.35
    });

    this.globe = new THREE.Mesh(geometry, material);
    // Initial tilt to show Indian Subcontinent & Bay of Bengal prominently
    this.globe.rotation.x = this.currentRotation.x;
    this.globe.rotation.y = this.currentRotation.y;
    this.scene.add(this.globe);
  }

  createAtmosphere() {
    // Custom Atmospheric Rim Glow Shader (Fresnel-like)
    const vertexShader = `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
        gl_FragColor = vec4(0.0, 0.88, 1.0, 1.0) * intensity * 1.5;
      }
    `;

    const atmosphereGeo = new THREE.SphereGeometry(this.globeRadius * 1.12, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });

    this.atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    this.scene.add(this.atmosphere);
  }

  generateCloudTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw procedural clouds using overlapping soft radial gradients
    const drawPuff = (cx, cy, r, opacity) => {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
      grad.addColorStop(0.5, `rgba(240, 248, 255, ${opacity * 0.6})`);
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    // Swirling monsoon clouds over Indian Ocean and Bay of Bengal
    for (let i = 0; i < 90; i++) {
      const x = (Math.sin(i * 1.7) * 0.45 + 0.5) * canvas.width;
      const y = (Math.cos(i * 2.3) * 0.35 + 0.5) * canvas.height;
      const r = 25 + Math.random() * 45;
      drawPuff(x, y, r, 0.25 + Math.random() * 0.2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  createClouds() {
    const cloudGeo = new THREE.SphereGeometry(this.globeRadius * 1.018, 64, 64);
    const cloudMat = new THREE.MeshPhongMaterial({
      map: this.generateCloudTexture(),
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.cloudLayer = new THREE.Mesh(cloudGeo, cloudMat);
    this.scene.add(this.cloudLayer);
  }

  // Convert Lon/Lat (degrees) on Earth to 3D Cartesian coordinates
  latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }

  createGeospatialHighlights() {
    // 3D Animated Pin on Guntur: lat 16.3067, lon 80.4365
    this.gunturPos = this.latLonToVector3(16.3067, 80.4365, this.globeRadius * 1.008);

    // Glowing Red Location Marker Pin (3D Cone + Sphere)
    const pinGroup = new THREE.Group();
    pinGroup.position.copy(this.gunturPos);
    pinGroup.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      this.gunturPos.clone().normalize()
    );

    // Pin Cone
    const coneGeo = new THREE.ConeGeometry(0.08, 0.32, 16);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = 0.16;
    pinGroup.add(cone);

    // Pin Head Sphere
    const headGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xff3344 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.32;
    pinGroup.add(head);

    // Pulsing Waves (Concentric Rings on Earth Surface)
    for (let r = 0; r < 3; r++) {
      const ringGeo = new THREE.RingGeometry(0.08, 0.12, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.01;
      ring.userData = { phase: r * (Math.PI / 1.5), baseScale: 1 };
      this.pulseRings.push(ring);
      pinGroup.add(ring);
    }

    this.globe.add(pinGroup);
    this.gunturPinGroup = pinGroup;
  }

  createSatelliteSystem() {
    this.satelliteGroup = new THREE.Group();

    // 1. Glowing Elliptical Orbit Track
    const orbitCurve = new THREE.EllipseCurve(
      0, 0,
      this.orbitRadius, this.orbitRadius * 0.85,
      0, 2 * Math.PI,
      false,
      0
    );
    const orbitPoints = orbitCurve.getPoints(120);
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(
      orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
    );
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.45
    });
    this.orbitLine = new THREE.Line(orbitGeo, orbitMat);
    this.orbitLine.rotation.x = -0.5; // Inclined orbit
    this.orbitLine.rotation.z = 0.45;
    this.scene.add(this.orbitLine);

    // 2. 3D Satellite Mesh
    this.satellite = new THREE.Group();

    // Main Satellite Body (Gold foil chassis)
    const bodyGeo = new THREE.BoxGeometry(0.32, 0.36, 0.45);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0xf59e0b,
      shininess: 90,
      specular: 0xffffff
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.satellite.add(body);

    // Left Solar Panel Array
    const panelGeo = new THREE.BoxGeometry(0.95, 0.35, 0.04);
    const panelMat = new THREE.MeshPhongMaterial({
      color: 0x0284c7,
      emissive: 0x0077b6,
      emissiveIntensity: 0.35,
      shininess: 90
    });
    const leftPanel = new THREE.Mesh(panelGeo, panelMat);
    leftPanel.position.set(-0.68, 0, 0);
    this.satellite.add(leftPanel);

    // Right Solar Panel Array
    const rightPanel = new THREE.Mesh(panelGeo, panelMat);
    rightPanel.position.set(0.68, 0, 0);
    this.satellite.add(rightPanel);

    // Antenna Dish
    const dishGeo = new THREE.ConeGeometry(0.18, 0.14, 16);
    const dishMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(0, 0, -0.28);
    dish.rotation.x = -Math.PI / 2;
    this.satellite.add(dish);

    // 3. Holographic Sensor Scan Cone pointing at Earth
    const beamGeo = new THREE.ConeGeometry(0.95, 3.6, 32, 1, true);
    beamGeo.rotateX(-Math.PI / 2);
    beamGeo.translate(0, 0, -1.8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.scanBeam = new THREE.Mesh(beamGeo, beamMat);
    this.satellite.add(this.scanBeam);

    this.scene.add(this.satellite);
  }

  createSpaceParticles() {
    const starCount = 350;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const dist = 12 + Math.random() * 20;

      positions[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = dist * Math.cos(phi);

      // Cyan to white stars
      colors[i * 3] = 0.6 + Math.random() * 0.4;
      colors[i * 3 + 1] = 0.85 + Math.random() * 0.15;
      colors[i * 3 + 2] = 1.0;
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.75
    });

    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);
  }

  setupEvents() {
    const dom = this.renderer.domElement;

    // Mouse Drag Rotation
    dom.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.autoRotate = false;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
      // Resume slow idle auto-rotation after 4 seconds of inactivity
      clearTimeout(this.resumeTimer);
      this.resumeTimer = setTimeout(() => {
        this.autoRotate = true;
      }, 4000);
    });

    dom.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.targetRotation.y += deltaX * 0.005;
      this.targetRotation.x = Math.max(-0.6, Math.min(0.6, this.targetRotation.x + deltaY * 0.005));

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    // Touch Support for Mobile
    dom.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.autoRotate = false;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    window.addEventListener("touchend", () => {
      this.isDragging = false;
      clearTimeout(this.resumeTimer);
      this.resumeTimer = setTimeout(() => {
        this.autoRotate = true;
      }, 4000);
    });

    dom.addEventListener("touchmove", (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

      this.targetRotation.y += deltaX * 0.006;
      this.targetRotation.x = Math.max(-0.6, Math.min(0.6, this.targetRotation.x + deltaY * 0.006));

      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    // Mouse Wheel Zoom
    dom.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY * 0.005;
      this.camera.position.z = Math.max(5.5, Math.min(16.0, this.camera.position.z + zoomFactor));
    }, { passive: false });

    // Click on Guntur Pin on Globe
    dom.addEventListener("click", (e) => {
      const rect = dom.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);
      if (this.gunturPinGroup) {
        const hits = raycaster.intersectObjects(this.gunturPinGroup.children, true);
        if (hits.length > 0) {
          this.zoomToGuntur();
          return;
        }
      }
    });

    // Wire Floating Guntur Tag Click
    const tagEl = document.getElementById("gunturFloatingTag");
    if (tagEl) {
      tagEl.style.cursor = "pointer";
      tagEl.title = "Click to focus & zoom into Guntur";
      tagEl.onclick = () => {
        this.zoomToGuntur();
      };
    }

    // Window Resize Handler
    window.addEventListener("resize", () => {
      this.resize();
    });
  }

  zoomToGuntur() {
    this.autoRotate = false;
    this.targetRotation = { x: 0.22, y: 3.05 };
    const startZ = this.camera.position.z;
    const targetZ = 6.8;
    const startTime = performance.now();
    const duration = 1200;

    const animateZoom = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      this.camera.position.z = startZ + (targetZ - startZ) * ease;
      if (progress < 1) {
        requestAnimationFrame(animateZoom);
      }
    };
    requestAnimationFrame(animateZoom);
  }

  resize() {
    if (!this.container || !this.camera || !this.renderer) return;
    this.width = this.container.clientWidth || 550;
    this.height = this.container.clientHeight || 520;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  animate() {
    requestAnimationFrame(this.animate);

    // 1. Auto-rotation or smooth drag damping
    if (this.autoRotate) {
      this.targetRotation.y += this.autoRotateSpeed;
    }
    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.08;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.08;

    if (this.globe) {
      this.globe.rotation.x = this.currentRotation.x;
      this.globe.rotation.y = this.currentRotation.y;
    }

    // 2. Slow cloud rotation
    if (this.cloudLayer) {
      this.cloudLayer.rotation.x = this.currentRotation.x;
      this.cloudLayer.rotation.y = this.currentRotation.y + 0.0012;
    }

    // 3. Satellite Orbit Animation
    this.orbitAngle += 0.0012;
    const satX = Math.cos(this.orbitAngle) * this.orbitRadius;
    const satZ = Math.sin(this.orbitAngle) * (this.orbitRadius * 0.85);

    // Apply tilt matrix to satellite position
    const satPos = new THREE.Vector3(satX, 0, satZ);
    satPos.applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.5);
    satPos.applyAxisAngle(new THREE.Vector3(0, 0, 1), 0.45);
    this.satellite.position.copy(satPos);

    // Point satellite and scan beam towards Guntur / Earth
    if (this.gunturPos && this.globe) {
      const gunturWorld = this.gunturPos.clone().applyMatrix4(this.globe.matrixWorld);
      this.satellite.lookAt(gunturWorld);
    } else {
      this.satellite.lookAt(0, 0, 0);
    }

    // Pulsate Scan Beam Intensity
    if (this.scanBeam) {
      const pulse = 0.18 + Math.sin(this.orbitAngle * 5) * 0.08;
      this.scanBeam.material.opacity = pulse;
    }

    // 4. Location Pin Radial Pulsing Rings
    this.pulseTime += 0.035;
    this.pulseRings.forEach(ring => {
      const phase = (this.pulseTime + ring.userData.phase) % (Math.PI * 2);
      const progress = phase / (Math.PI * 2);
      const scale = 1 + progress * 2.8;
      ring.scale.set(scale, scale, 1);
      ring.material.opacity = Math.max(0, 0.85 * (1 - progress));
    });

    // 5. Update HTML Pin Label Position (Screen Projection)
    this.updateGunturLabelPosition();

    // 6. Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  updateGunturLabelPosition() {
    const labelEl = document.getElementById("gunturFloatingTag");
    if (!labelEl || !this.globe || !this.gunturPos) return;

    // Get world coordinates of Guntur marker
    const worldPos = this.gunturPos.clone();
    worldPos.applyMatrix4(this.globe.matrixWorld);

    // Project to 2D screen coordinates
    const screenPos = worldPos.clone().project(this.camera);

    // Check if marker is facing the camera (not on backside of Earth)
    const isVisible = screenPos.z < 1.0 && worldPos.dot(this.camera.position.clone().sub(worldPos)) > 0;

    if (isVisible) {
      const x = (screenPos.x * 0.5 + 0.5) * this.width;
      const y = (-screenPos.y * 0.5 + 0.5) * this.height;
      labelEl.style.transform = `translate3d(${x + 16}px, ${y - 18}px, 0)`;
      labelEl.style.opacity = "1";
      labelEl.style.display = "flex";
    } else {
      labelEl.style.opacity = "0";
    }
  }
}

// Auto-initialize when DOM loads
window.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("earthGlobeContainer")) {
    window.earthVisual = new Earth3DVisual("earthGlobeContainer");
  }
});

