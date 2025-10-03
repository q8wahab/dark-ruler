// ==================== GAME INITIALIZATION ====================
let scene, camera, renderer, clock;
let player, terrain, enemies = [], dragons = [];
let ammoPickups = [];
let gameState = {
    running: false,
    paused: false,
    screen: 'menu',
    enemiesDefeated: 0,
    currentWave: 1,
    totalWaves: 20,
    waveActive: false,
    currentTerritory: 'Prison Ruins'
};

// Input handling
const keys = {};
const mouse = { x: 0, y: 0, locked: false };
const mobileInput = {
    joystick: { x: 0, y: 0, active: false },
    shoot: false,
    jump: false
};

// ==================== THREE.JS SETUP ====================
function initThreeJS() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    // Renderer with 1K graphics
    const container = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        precision: "highp"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1); // 1K quality
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
    container.appendChild(renderer.domElement);

    // Clock for fixed timestep
    clock = new THREE.Clock();

    // Enhanced realistic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Main sun light with 1K quality shadows
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 2.5);
    dirLight.position.set(100, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048; // 1K quality shadows
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -250;
    dirLight.shadow.camera.right = 250;
    dirLight.shadow.camera.top = 250;
    dirLight.shadow.camera.bottom = -250;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 1000;
    dirLight.shadow.bias = -0.0001;
    dirLight.shadow.normalBias = 0.05;
    dirLight.shadow.radius = 4;
    scene.add(dirLight);

    // Hemisphere light for realistic sky/ground lighting
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d5a2f, 0.8);
    scene.add(hemiLight);

    // Atmospheric fog
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.003);

    // Window resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ==================== TERRAIN GENERATION ====================
function createTerrain() {
    const terrainSize = 200; // Smaller platform
    const segments = 50; // Lower segments for flat terrain
    const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);

    // Flat terrain - no hills
    geometry.computeVertexNormals();

    // Green grass material
    const material = new THREE.MeshStandardMaterial({
        color: 0x3a8c3a,
        flatShading: false,
        roughness: 1.0,
        metalness: 0.0,
        side: THREE.DoubleSide
    });

    terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    scene.add(terrain);

    // Add trees and grass obstacles
    createObstacles();
}

function createObstacles() {
    // Add trees
    for (let i = 0; i < 15; i++) {
        const x = (Math.random() - 0.5) * 180;
        const z = (Math.random() - 0.5) * 180;

        // Tree trunk
        const trunkGeom = new THREE.CylinderGeometry(0.5, 0.7, 4, 8);
        const trunkMat = new THREE.MeshStandardMaterial({
            color: 0x4a3728,
            roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeom, trunkMat);
        trunk.position.set(x, 2, z);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        scene.add(trunk);

        // Tree foliage
        const foliageGeom = new THREE.ConeGeometry(2, 4, 8);
        const foliageMat = new THREE.MeshStandardMaterial({
            color: 0x2d5016,
            roughness: 0.95
        });
        const foliage = new THREE.Mesh(foliageGeom, foliageMat);
        foliage.position.set(x, 5, z);
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        scene.add(foliage);
    }

    // Add grass patches
    for (let i = 0; i < 25; i++) {
        const x = (Math.random() - 0.5) * 190;
        const z = (Math.random() - 0.5) * 190;

        const grassGeom = new THREE.ConeGeometry(0.3, 0.8, 4);
        const grassMat = new THREE.MeshStandardMaterial({
            color: 0x4a9c3a,
            roughness: 1.0
        });
        const grass = new THREE.Mesh(grassGeom, grassMat);
        grass.position.set(x, 0.4, z);
        grass.rotation.x = Math.random() * 0.2 - 0.1;
        grass.castShadow = true;
        scene.add(grass);
    }
}

// Get terrain height at position
function getTerrainHeight(x, z) {
    return 0; // Flat terrain
}

// ==================== PLAYER ====================
class Player {
    constructor() {
        // Low-poly character - improved
        const bodyGeom = new THREE.BoxGeometry(1, 1.5, 0.8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x4169E1,
            flatShading: false,
            metalness: 0.1,
            roughness: 0.8
        });
        this.mesh = new THREE.Group();

        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = 0.75;
        body.castShadow = true;
        this.mesh.add(body);

        // Head
        const headGeom = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        const head = new THREE.Mesh(headGeom, bodyMat);
        head.position.y = 1.8;
        head.castShadow = true;
        this.mesh.add(head);

        // Arms
        const armGeom = new THREE.BoxGeometry(0.3, 1, 0.3);
        const leftArm = new THREE.Mesh(armGeom, bodyMat);
        leftArm.position.set(-0.65, 0.75, 0);
        leftArm.castShadow = true;
        this.mesh.add(leftArm);

        const rightArm = new THREE.Mesh(armGeom, bodyMat);
        rightArm.position.set(0.65, 0.75, 0);
        rightArm.castShadow = true;
        this.mesh.add(rightArm);

        // Legs
        const legGeom = new THREE.BoxGeometry(0.35, 0.8, 0.35);
        const leftLeg = new THREE.Mesh(legGeom, bodyMat);
        leftLeg.position.set(-0.3, -0.4, 0);
        leftLeg.castShadow = true;
        this.mesh.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeom, bodyMat);
        rightLeg.position.set(0.3, -0.4, 0);
        rightLeg.castShadow = true;
        this.mesh.add(rightLeg);

        // Crown
        const crownGeom = new THREE.ConeGeometry(0.6, 0.5, 6);
        const crownMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            flatShading: true,
            emissive: 0xffd700,
            emissiveIntensity: 0.4,
            metalness: 0.8,
            roughness: 0.2
        });
        this.crown = new THREE.Mesh(crownGeom, crownMat);
        this.crown.position.y = 2.3;
        this.crown.castShadow = true;
        this.mesh.add(this.crown);

        // Create first-person gun (separate from body)
        this.createGun();

        this.mesh.position.y = 1;
        this.mesh.visible = false; // Hide player body in first-person

        scene.add(this.mesh);

        // Stats
        this.health = 100;
        this.maxHealth = 100;
        this.stamina = 100;
        this.maxStamina = 100;
        this.ammo = 60;
        this.maxAmmo = 60;
        this.speed = 8;
        this.sprintMultiplier = 1.5;
        this.attacking = false;
        this.attackCooldown = 0;
        this.attackRange = 100; // Much longer range for pistol
        this.attackDamage = 35;
        this.headshotMultiplier = 2; // Headshots do 2x damage

        // Movement
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.isGrounded = true;
        this.verticalVelocity = 0;
        this.gravity = -25;
        this.jumpPower = 10;

        // First-person camera
        this.cameraRotation = { yaw: 0, pitch: 0 };
        this.eyeHeight = 1.6;

        // Ammo regeneration timer
        this.ammoRegenTimer = 0;
        this.ammoRegenInterval = 60; // 60 seconds = 1 minute
    }

    createGun() {
        this.gun = new THREE.Group();

        // Pistol handle
        const handleGeom = new THREE.BoxGeometry(0.08, 0.15, 0.12);
        const handleMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            flatShading: true,
            roughness: 0.7
        });
        const handle = new THREE.Mesh(handleGeom, handleMat);
        handle.position.set(0, -0.05, 0);
        this.gun.add(handle);

        // Barrel
        const barrelGeom = new THREE.BoxGeometry(0.04, 0.18, 0.04);
        const barrelMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            flatShading: true,
            metalness: 0.8,
            roughness: 0.3
        });
        const barrel = new THREE.Mesh(barrelGeom, barrelMat);
        barrel.position.set(0, 0.08, -0.04);
        this.gun.add(barrel);

        // Slide
        const slideGeom = new THREE.BoxGeometry(0.06, 0.08, 0.12);
        const slide = new THREE.Mesh(slideGeom, barrelMat);
        slide.position.set(0, 0.04, 0);
        this.gun.add(slide);

        scene.add(this.gun);
    }

    update(delta) {
        // Regenerate stamina (slower)
        if (this.stamina < this.maxStamina) {
            this.stamina = Math.min(this.maxStamina, this.stamina + delta * 5); // Slower regen (was 20)
        }

        // Ammo regeneration every minute
        this.ammoRegenTimer += delta;
        if (this.ammoRegenTimer >= this.ammoRegenInterval) {
            this.ammoRegenTimer = 0;
            this.ammo = Math.min(this.maxAmmo, this.ammo + 5);
            console.log("Auto ammo regen: +5 bullets");
            updateResourceBars();
        }

        // Movement
        this.direction.set(0, 0, 0);

        let speed = this.speed;
        if (keys['shift'] && this.stamina > 0 && this.isGrounded) {
            speed *= this.sprintMultiplier;
            this.stamina = Math.max(0, this.stamina - delta * 40); // Faster drain (was 10)
        }

        // Get camera forward and right vectors
        const forward = new THREE.Vector3(
            Math.sin(this.cameraRotation.yaw),
            0,
            Math.cos(this.cameraRotation.yaw)
        );
        const right = new THREE.Vector3(
            Math.cos(this.cameraRotation.yaw),
            0,
            -Math.sin(this.cameraRotation.yaw)
        );

        // Keyboard controls: W = backward, S = forward, A = left, D = right
        if (keys['w']) {
            this.mesh.position.x -= forward.x * speed * delta;
            this.mesh.position.z -= forward.z * speed * delta;
        }
        if (keys['s']) {
            this.mesh.position.x += forward.x * speed * delta;
            this.mesh.position.z += forward.z * speed * delta;
        }
        if (keys['a']) {
            this.mesh.position.x -= right.x * speed * delta;
            this.mesh.position.z -= right.z * speed * delta;
        }
        if (keys['d']) {
            this.mesh.position.x += right.x * speed * delta;
            this.mesh.position.z += right.z * speed * delta;
        }

        // Mobile joystick controls
        if (mobileInput.joystick.active) {
            const joyX = mobileInput.joystick.x;
            const joyY = mobileInput.joystick.y;

            // Move based on joystick direction
            this.mesh.position.x += (right.x * joyX - forward.x * joyY) * speed * delta;
            this.mesh.position.z += (right.z * joyX - forward.z * joyY) * speed * delta;
        }

        // Gravity and jumping
        if (!this.isGrounded) {
            this.verticalVelocity += this.gravity * delta;
        } else {
            this.verticalVelocity = 0;
        }

        this.mesh.position.y += this.verticalVelocity * delta;

        // Terrain collision - stand on hills (add offset to stand ON the surface)
        const terrainHeight = getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
        const playerBaseHeight = terrainHeight + 0.5; // Add offset to stand on surface

        if (this.mesh.position.y <= playerBaseHeight) {
            this.mesh.position.y = playerBaseHeight;
            this.isGrounded = true;
            this.verticalVelocity = 0;
        } else {
            this.isGrounded = false;
        }

        // Keep in bounds
        const limit = 95; // Smaller platform bounds
        this.mesh.position.x = Math.max(-limit, Math.min(limit, this.mesh.position.x));
        this.mesh.position.z = Math.max(-limit, Math.min(limit, this.mesh.position.z));

        // Update camera
        this.updateCamera();

        // Attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }

        // Clean up shot effects
        if (this.shotTimer > 0) {
            this.shotTimer -= delta;
            if (this.shotTimer <= 0) {
                // Remove effects
                if (this.muzzleFlash) {
                    scene.remove(this.muzzleFlash);
                    this.muzzleFlash.geometry.dispose();
                    this.muzzleFlash.material.dispose();
                    this.muzzleFlash = null;
                }
                if (this.bullet) {
                    scene.remove(this.bullet);
                    this.bullet.geometry.dispose();
                    this.bullet.material.dispose();
                    this.bullet = null;
                }
                this.attacking = false;
            }
        }

        // Update UI
        updateResourceBars();
    }

    updateCamera() {
        // First-person camera at eye height
        camera.position.x = this.mesh.position.x;
        camera.position.y = this.mesh.position.y + this.eyeHeight;
        camera.position.z = this.mesh.position.z;

        // Camera rotation from mouse
        camera.rotation.order = 'YXZ';
        camera.rotation.y = this.cameraRotation.yaw;
        camera.rotation.x = this.cameraRotation.pitch;

        // Update gun position to follow camera
        if (this.gun) {
            this.updateGunPosition();
        }
    }

    updateGunPosition() {
        // Position gun in front of camera
        const gunDistance = 0.5;
        const gunRight = 0.3;
        const gunDown = -0.2;

        // Calculate position relative to camera
        const forward = new THREE.Vector3(
            Math.sin(this.cameraRotation.yaw),
            0,
            Math.cos(this.cameraRotation.yaw)
        );
        const right = new THREE.Vector3(
            Math.cos(this.cameraRotation.yaw),
            0,
            -Math.sin(this.cameraRotation.yaw)
        );

        this.gun.position.copy(camera.position);
        this.gun.position.addScaledVector(forward, gunDistance);
        this.gun.position.addScaledVector(right, gunRight);
        this.gun.position.y += gunDown;

        // Rotate gun with camera
        this.gun.rotation.y = this.cameraRotation.yaw;
        this.gun.rotation.x = this.cameraRotation.pitch;
    }

    jump() {
        if (this.isGrounded) {
            this.verticalVelocity = this.jumpPower;
            this.isGrounded = false;
        }
    }

    attack() {
        if (this.attackCooldown > 0 || this.attacking || this.ammo <= 0) return;

        this.attacking = true;
        this.attackCooldown = 0.15; // Faster fire rate (was 0.3)
        this.ammo--;

        console.log("SHOOTING! Ammo:", this.ammo);

        // Gun recoil
        if (this.gun) {
            const originalPos = this.gun.position.clone();
            this.gun.position.z += 0.05; // Kick back
            setTimeout(() => {
                if (this.gun) this.gun.position.copy(originalPos);
            }, 50);
        }

        // Get camera direction for shooting
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);

        // Muzzle flash at gun position
        const muzzlePos = camera.position.clone();
        muzzlePos.add(cameraDirection.clone().multiplyScalar(0.5));

        const flashGeom = new THREE.SphereGeometry(0.2, 8, 8);
        const flashMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 1
        });
        const muzzleFlash = new THREE.Mesh(flashGeom, flashMat);
        muzzleFlash.position.copy(muzzlePos);
        scene.add(muzzleFlash);

        // Bullet tracer line
        const points = [];
        points.push(muzzlePos.clone());
        points.push(muzzlePos.clone().add(cameraDirection.clone().multiplyScalar(this.attackRange)));

        const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 3 });
        const bullet = new THREE.Line(lineGeom, lineMat);
        scene.add(bullet);

        // Store references for cleanup
        this.muzzleFlash = muzzleFlash;
        this.bullet = bullet;
        this.shotTimer = 0.1;

        // Raycast to hit enemies
        const raycaster = new THREE.Raycaster(camera.position, cameraDirection, 0, this.attackRange);

        let closestEnemy = null;
        let closestDistance = Infinity;
        let isHeadshot = false;

        [...enemies, ...dragons].forEach(enemy => {
            if (enemy.dead) return;

            // Check if enemy mesh intersects with ray
            const intersects = raycaster.intersectObject(enemy.mesh, true);

            if (intersects.length > 0) {
                const distance = intersects[0].distance;
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestEnemy = enemy;

                    // Check if hit the head (check object name or position)
                    const hitObject = intersects[0].object;
                    const hitPoint = intersects[0].point;

                    // Head is at higher Y position - check if hit is in upper portion
                    const enemyHeadHeight = enemy.mesh.position.y + (enemy.type === 'dragon' ? 0.3 : 1.55);
                    isHeadshot = hitPoint.y >= enemyHeadHeight - 0.3; // Within head range
                }
            }
        });

        // Hit closest enemy with damage calculation
        if (closestEnemy) {
            let damage = this.attackDamage;
            if (isHeadshot) {
                damage *= this.headshotMultiplier;
                console.log("HEADSHOT! Damage:", damage, "Distance:", closestDistance);
            } else {
                console.log("HIT ENEMY! Damage:", damage, "Distance:", closestDistance);
            }
            closestEnemy.takeDamage(damage, isHeadshot);
        } else {
            console.log("MISS - no enemy hit");
        }

        updateResourceBars();
    }

    takeDamage(damage) {
        this.health = Math.max(0, this.health - damage);
        updateResourceBars();

        // Screen flash when hit
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        flash.style.pointerEvents = 'none';
        flash.style.zIndex = '50';
        document.body.appendChild(flash);
        setTimeout(() => document.body.removeChild(flash), 100);

        if (this.health <= 0) {
            gameOver();
        }
    }

    dodge() {
        if (this.stamina < 30) return;
        this.stamina -= 30;

        // Quick dash in current direction
        const dashPower = 5;
        if (this.direction.length() > 0) {
            const angle = this.cameraRotation.yaw;
            const x = this.direction.x * Math.cos(angle) - this.direction.z * Math.sin(angle);
            const z = this.direction.x * Math.sin(angle) + this.direction.z * Math.cos(angle);

            this.mesh.position.x += x * dashPower;
            this.mesh.position.z += z * dashPower;
        }
    }
}

// ==================== ENEMY ====================
class Enemy {
    constructor(x, z, type = 'goblin') {
        this.type = type;
        this.headMesh = null; // Reference to head for headshot detection
        const isKing = type === 'king';

        // Low-poly enemy model - smaller size
        const size = isKing ? 1.5 : 1;
        this.mesh = new THREE.Group();

        // More realistic enemy material
        const bodyMat = new THREE.MeshStandardMaterial({
            color: isKing ? 0x8B0000 : 0x3d5a2f,
            flatShading: false,
            roughness: 0.7,
            metalness: 0.1,
            normalScale: new THREE.Vector2(1, 1)
        });

        // Smooth human-like torso
        const bodyGeom = new THREE.CylinderGeometry(size * 0.35, size * 0.4, size * 1, 32);
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = size * 0.5;
        body.castShadow = true;
        this.mesh.add(body);

        // Neck cylinder - connects body to head
        const neckGeom = new THREE.CylinderGeometry(size * 0.15, size * 0.2, size * 0.35, 16);
        const neck = new THREE.Mesh(neckGeom, bodyMat);
        neck.position.y = size * 1.175; // Positioned to connect body top to head bottom
        neck.castShadow = true;
        this.mesh.add(neck);

        // Smooth round head - connected via neck
        const headGeom = new THREE.SphereGeometry(size * 0.35, 32, 32);
        const head = new THREE.Mesh(headGeom, bodyMat);
        head.position.y = size * 1.525; // Head bottom touches neck top
        head.castShadow = true;
        head.name = 'head'; // Mark as head for headshot detection
        this.mesh.add(head);
        this.headMesh = head;

        // Smooth glowing eyes
        const eyeGeom = new THREE.SphereGeometry(0.08, 16, 16);
        const eyeMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1
        });
        const eye1 = new THREE.Mesh(eyeGeom, eyeMat);
        const eye2 = new THREE.Mesh(eyeGeom, eyeMat);
        eye1.position.set(-0.15, size * 1.525, size * 0.3);
        eye2.position.set(0.15, size * 1.525, size * 0.3);
        this.mesh.add(eye1);
        this.mesh.add(eye2);

        // Smooth arms - connected to shoulders
        const upperArmGeom = new THREE.CylinderGeometry(size * 0.12, size * 0.1, size * 0.5, 16);
        const leftArm = new THREE.Mesh(upperArmGeom, bodyMat);
        leftArm.position.set(-size * 0.5, size * 0.75, 0); // Aligned with shoulder
        leftArm.castShadow = true;
        this.mesh.add(leftArm);

        const rightArm = new THREE.Mesh(upperArmGeom, bodyMat);
        rightArm.position.set(size * 0.5, size * 0.75, 0); // Aligned with shoulder
        rightArm.castShadow = true;
        this.mesh.add(rightArm);

        // Legs - connected to pelvis
        const legGeom = new THREE.CylinderGeometry(size * 0.15, size * 0.12, size * 0.7, 16);
        const leftLeg = new THREE.Mesh(legGeom, bodyMat);
        leftLeg.position.set(-size * 0.15, -0.15, 0); // Connected to bottom of body
        leftLeg.castShadow = true;
        this.mesh.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeom, bodyMat);
        rightLeg.position.set(size * 0.15, -0.15, 0); // Connected to bottom of body
        rightLeg.castShadow = true;
        this.mesh.add(rightLeg);

        this.mesh.position.set(x, 0, z);

        scene.add(this.mesh);

        // Stats
        this.health = isKing ? 100 : 50;
        this.maxHealth = this.health;
        this.speed = isKing ? 5 : 4; // 2x faster
        this.damage = isKing ? 20 : 10;
        this.chaseRange = 80; // Notice from much farther
        this.attackRange = 1.5;
        this.attackCooldown = 0;
        this.state = 'patrol';
        this.patrolAngle = Math.random() * Math.PI * 2;
        this.dead = false;
    }

    takeDamage(damage, isHeadshot = false) {
        this.health -= damage;

        if (this.health <= 0 && !this.dead) {
            this.die();
        }
    }

    update(delta, playerPos) {
        if (this.dead) return;

        const distance = this.mesh.position.distanceTo(playerPos);

        // State machine
        if (distance < this.attackRange) {
            this.state = 'attack';
        } else if (distance < this.chaseRange) {
            this.state = 'chase';
        } else {
            this.state = 'patrol';
        }

        // Behavior
        if (this.state === 'chase') {
            const direction = new THREE.Vector3()
                .subVectors(playerPos, this.mesh.position)
                .normalize();

            this.mesh.position.x += direction.x * this.speed * delta;
            this.mesh.position.z += direction.z * this.speed * delta;
            this.mesh.lookAt(playerPos);
        } else if (this.state === 'patrol') {
            this.patrolAngle += (Math.random() - 0.5) * 0.1;
            this.mesh.position.x += Math.cos(this.patrolAngle) * this.speed * 0.3 * delta;
            this.mesh.position.z += Math.sin(this.patrolAngle) * this.speed * 0.3 * delta;
        } else if (this.state === 'attack') {
            // Only damage if actually touching the player
            const touchDistance = this.mesh.position.distanceTo(playerPos);
            if (this.attackCooldown <= 0 && touchDistance < this.attackRange) {
                player.takeDamage(this.damage);
                this.attackCooldown = 1.5;
            }
        }

        // Stand on terrain (same level as player)
        const terrainHeight = getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
        this.mesh.position.y = terrainHeight;

        // Update cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }

        // Update hit flash - simplified
        if (this.hitFlash > 0) {
            this.hitFlash -= delta;
            if (this.hitFlash <= 0) {
                this.hitFlash = 0;
            }
        }

        // Keep in bounds
        const limit = 95; // Smaller platform bounds
        this.mesh.position.x = Math.max(-limit, Math.min(limit, this.mesh.position.x));
        this.mesh.position.z = Math.max(-limit, Math.min(limit, this.mesh.position.z));
    }

    die() {
        this.dead = true;
        scene.remove(this.mesh);
        gameState.enemiesDefeated++;
        updateStats();
        checkVictory();
    }
}

// ==================== DRAGON ====================
class Dragon {
    constructor(x, z, isKing = false) {
        this.isKing = isKing;
        this.type = 'dragon'; // Mark as dragon type
        this.headMesh = null; // Reference to head for headshot detection
        const size = isKing ? 2.5 : 1.5; // Smaller size

        // More realistic dragon material
        const bodyMat = new THREE.MeshStandardMaterial({
            color: isKing ? 0xb8860b : 0xff4500,
            flatShading: false,
            emissive: isKing ? 0xb8860b : 0xff4500,
            emissiveIntensity: 0.3,
            metalness: 0.4,
            roughness: 0.6,
            normalScale: new THREE.Vector2(1.2, 1.2)
        });

        this.mesh = new THREE.Group();

        // Smooth elongated body for dragon
        const bodyGeom = new THREE.CylinderGeometry(size * 0.45, size * 0.5, size * 1.5, 32);
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.rotation.z = Math.PI / 2; // Rotate to horizontal
        body.castShadow = true;
        this.mesh.add(body);

        // Smooth wings
        const wingMat = new THREE.MeshStandardMaterial({
            color: isKing ? 0xdaa520 : 0xff6347,
            flatShading: false,
            transparent: true,
            opacity: 0.9,
            roughness: 0.6,
            metalness: 0.2
        });

        const leftWingGeom = new THREE.BoxGeometry(size * 2, 0.08, size * 1.5, 12, 1, 10);
        const leftWing = new THREE.Mesh(leftWingGeom, wingMat);
        leftWing.position.set(-size * 1, 0.2, 0);
        leftWing.rotation.z = 0.3;
        leftWing.castShadow = true;
        this.mesh.add(leftWing);

        const rightWing = new THREE.Mesh(leftWingGeom, wingMat);
        rightWing.position.set(size * 1, 0.2, 0);
        rightWing.rotation.z = -0.3;
        rightWing.castShadow = true;
        this.mesh.add(rightWing);

        // Dragon neck cylinder - properly connects body to head
        const neckGeom = new THREE.CylinderGeometry(size * 0.2, size * 0.3, size * 0.6, 16);
        const neck = new THREE.Mesh(neckGeom, bodyMat);
        neck.position.set(0, 0.15, size * 0.65); // Starts from body front
        neck.rotation.x = Math.PI / 8; // Slight tilt forward
        neck.castShadow = true;
        this.mesh.add(neck);

        // Smooth round head - connected to neck
        const headGeom = new THREE.SphereGeometry(size * 0.4, 32, 32);
        const head = new THREE.Mesh(headGeom, bodyMat);
        head.position.set(0, 0.25, size * 1.05); // Touches neck end
        head.castShadow = true;
        head.name = 'head'; // Mark as head for headshot detection
        this.mesh.add(head);
        this.headMesh = head;

        // Smooth horns
        const hornGeom = new THREE.ConeGeometry(0.1, 0.5, 16);
        const hornMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            flatShading: false,
            roughness: 0.7,
            metalness: 0.3
        });
        const horn1 = new THREE.Mesh(hornGeom, hornMat);
        horn1.position.set(-0.2, 0.65, size * 1.05); // Aligned with head
        this.mesh.add(horn1);

        const horn2 = new THREE.Mesh(hornGeom, hornMat);
        horn2.position.set(0.2, 0.65, size * 1.05); // Aligned with head
        this.mesh.add(horn2);

        // Smooth tail
        const tailGeom = new THREE.CylinderGeometry(size * 0.15, size * 0.05, size * 1.2, 16);
        const tail = new THREE.Mesh(tailGeom, bodyMat);
        tail.position.set(0, 0, -size * 1);
        tail.rotation.x = Math.PI / 2;
        tail.castShadow = true;
        this.mesh.add(tail);

        this.mesh.position.set(x, 5 + Math.random() * 3, z);

        scene.add(this.mesh);

        // Stats
        this.health = isKing ? 200 : 80;
        this.maxHealth = this.health;
        this.speed = 6; // 2x faster
        this.damage = isKing ? 25 : 15;
        this.attackRange = 3;
        this.attackCooldown = 0;
        this.floatOffset = Math.random() * Math.PI * 2;
        this.dead = false;
    }

    update(delta, playerPos, time) {
        if (this.dead) return;

        // Float effect
        this.mesh.position.y = 5 + Math.sin(time * 2 + this.floatOffset) * 1.5;

        const distance = this.mesh.position.distanceTo(playerPos);

        // Chase player from farther away
        if (distance < 80) {
            const direction = new THREE.Vector3()
                .subVectors(playerPos, this.mesh.position)
                .normalize();

            this.mesh.position.x += direction.x * this.speed * delta;
            this.mesh.position.z += direction.z * this.speed * delta;
            this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
        }

        // Attack - only when touching player
        if (distance < this.attackRange && this.attackCooldown <= 0) {
            player.takeDamage(this.damage);
            this.attackCooldown = 2;

            // Fire breath effect
            this.createFireBreath();
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }

        // Update hit flash - simplified
        if (this.hitFlash > 0) {
            this.hitFlash -= delta;
            if (this.hitFlash <= 0) {
                this.hitFlash = 0;
            }
        }

        // Keep in bounds
        const limit = 95; // Smaller platform bounds
        this.mesh.position.x = Math.max(-limit, Math.min(limit, this.mesh.position.x));
        this.mesh.position.z = Math.max(-limit, Math.min(limit, this.mesh.position.z));
    }

    takeDamage(damage, isHeadshot = false) {
        this.health -= damage;

        if (this.health <= 0 && !this.dead) {
            this.die();
        }
    }

    createFireBreath() {
        const direction = new THREE.Vector3()
            .subVectors(player.mesh.position, this.mesh.position)
            .normalize();

        for (let i = 0; i < 15; i++) {
            const particleGeom = new THREE.SphereGeometry(0.3, 6, 6);
            const particleMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0xff4500 : 0xffa500,
                transparent: true,
                opacity: 0.9
            });
            const particle = new THREE.Mesh(particleGeom, particleMat);
            particle.position.copy(this.mesh.position);

            const offset = i * 0.5;
            particle.position.x += direction.x * offset + (Math.random() - 0.5) * 0.5;
            particle.position.y += (Math.random() - 0.5) * 0.5;
            particle.position.z += direction.z * offset + (Math.random() - 0.5) * 0.5;

            scene.add(particle);

            setTimeout(() => scene.remove(particle), 500);
        }
    }

    die() {
        this.dead = true;
        scene.remove(this.mesh);
        gameState.enemiesDefeated++;
        updateStats();
        checkVictory();
    }
}

// ==================== AMMO PICKUP ====================
class AmmoPickup {
    constructor(x, z) {
        // Bullet shape
        this.mesh = new THREE.Group();

        // Bullet casing (cylinder)
        const casingGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 16);
        const casingMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0xffd700,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.3
        });
        const casing = new THREE.Mesh(casingGeom, casingMat);
        this.mesh.add(casing);

        // Bullet tip (cone)
        const tipGeom = new THREE.ConeGeometry(0.15, 0.4, 16);
        const tipMat = new THREE.MeshStandardMaterial({
            color: 0xc0c0c0,
            metalness: 0.9,
            roughness: 0.2
        });
        const tip = new THREE.Mesh(tipGeom, tipMat);
        tip.position.y = 0.5;
        this.mesh.add(tip);

        this.mesh.position.set(x, 0.5, z);
        this.mesh.rotation.z = Math.PI / 2; // Rotate to horizontal
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        this.collected = false;
        this.rotationSpeed = 2;
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    update(delta, time) {
        if (this.collected) return;

        // Rotate and bob (spin around its length)
        this.mesh.rotation.z += delta * this.rotationSpeed;
        this.mesh.position.y = 0.5 + Math.sin(time * 3 + this.bobOffset) * 0.2;

        // Check if player is close enough to collect
        if (player) {
            const distance = this.mesh.position.distanceTo(player.mesh.position);
            if (distance < 2) {
                this.collect();
            }
        }
    }

    collect() {
        this.collected = true;
        scene.remove(this.mesh);

        // Give player 15 bullets
        const ammoGained = 15;
        player.ammo = Math.min(player.maxAmmo, player.ammo + ammoGained);
        updateResourceBars();

        console.log(`Collected ammo! +${ammoGained}`);
    }
}

function spawnAmmoPickups(count) {
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 160;
        const z = (Math.random() - 0.5) * 160;
        ammoPickups.push(new AmmoPickup(x, z));
    }
}

// ==================== SPAWNING ====================
function spawnWave(waveNumber) {
    // Clear existing
    enemies.forEach(e => e.mesh && scene.remove(e.mesh));
    dragons.forEach(d => d.mesh && scene.remove(d.mesh));
    ammoPickups.forEach(a => a.mesh && scene.remove(a.mesh));
    enemies = [];
    dragons = [];
    ammoPickups = [];

    gameState.waveActive = true;

    // Scale difficulty with wave number
    const goblinCount = 5 + waveNumber * 2;
    const kingCount = Math.floor(waveNumber / 2) + 1;
    const dragonCount = Math.floor(waveNumber / 3) + 1;
    const dragonKingCount = waveNumber >= 5 ? 1 : 0;

    // Spawn goblins (spread across smaller map)
    for (let i = 0; i < goblinCount; i++) {
        const x = (Math.random() - 0.5) * 160;
        const z = (Math.random() - 0.5) * 160;
        const enemy = new Enemy(x, z, 'goblin');
        // Increase stats with wave
        enemy.health += waveNumber * 10;
        enemy.maxHealth = enemy.health;
        enemy.damage += Math.floor(waveNumber / 2);
        enemies.push(enemy);
    }

    // Spawn goblin kings
    for (let i = 0; i < kingCount; i++) {
        const x = (Math.random() - 0.5) * 160;
        const z = (Math.random() - 0.5) * 160;
        const enemy = new Enemy(x, z, 'king');
        enemy.health += waveNumber * 15;
        enemy.maxHealth = enemy.health;
        enemy.damage += Math.floor(waveNumber / 2);
        enemies.push(enemy);
    }

    // Spawn dragons (after wave 2)
    if (waveNumber >= 2) {
        for (let i = 0; i < dragonCount; i++) {
            const x = (Math.random() - 0.5) * 160;
            const z = (Math.random() - 0.5) * 160;
            const dragon = new Dragon(x, z, false);
            dragon.health += waveNumber * 20;
            dragon.maxHealth = dragon.health;
            dragon.damage += Math.floor(waveNumber / 2);
            dragons.push(dragon);
        }
    }

    // Spawn dragon king (wave 5+)
    if (dragonKingCount > 0) {
        const dragon = new Dragon(0, -50, true);
        dragon.health += waveNumber * 25;
        dragon.maxHealth = dragon.health;
        dragon.damage += Math.floor(waveNumber / 2);
        dragons.push(dragon);
    }

    // Spawn 15 ammo pickups
    const ammoCount = 15;
    spawnAmmoPickups(ammoCount);

    updateWaveUI();
}

// ==================== INPUT HANDLING ====================
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;

    if (e.key === ' ') {
        e.preventDefault();
        if (gameState.running && player) {
            player.jump();
        }
    }

    if (e.key.toLowerCase() === 'e') {
        if (gameState.running && player) {
            player.dodge();
        }
    }

    if (e.key === 'Escape') {
        if (gameState.running) {
            togglePause();
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Mouse look - first person
window.addEventListener('mousemove', (e) => {
    if (!mouse.locked || !player) return;

    const sensitivity = 0.002;

    // Yaw (left/right)
    player.cameraRotation.yaw -= e.movementX * sensitivity;

    // Pitch (up/down)
    player.cameraRotation.pitch -= e.movementY * sensitivity;

    // Clamp pitch to prevent over-rotation
    player.cameraRotation.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, player.cameraRotation.pitch));
});

// Pointer lock
document.addEventListener('click', (e) => {
    console.log("Click detected!", {
        running: gameState.running,
        locked: mouse.locked,
        hasPlayer: !!player
    });

    if (gameState.running && !mouse.locked) {
        console.log("Requesting pointer lock");
        renderer.domElement.requestPointerLock();
    }
});

// Mouse attack
document.addEventListener('mousedown', (e) => {
    console.log("Mousedown detected!", {
        button: e.button,
        running: gameState.running,
        locked: mouse.locked,
        hasPlayer: !!player
    });

    if (gameState.running && player && mouse.locked) {
        console.log("Calling player.attack() from mousedown");
        player.attack();
    }
});

// Prevent context menu
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

document.addEventListener('pointerlockchange', () => {
    mouse.locked = document.pointerLockElement === renderer.domElement;
    console.log("Pointer lock changed:", mouse.locked);
});

// ==================== UI FUNCTIONS ====================
function updateResourceBars() {
    if (!player) return;

    const healthFill = document.getElementById('health-fill');
    const healthText = document.getElementById('health-text');
    const staminaFill = document.getElementById('stamina-fill');
    const ammoText = document.getElementById('ammo-text');

    healthFill.style.width = (player.health / player.maxHealth * 100) + '%';
    healthText.textContent = `${Math.round(player.health)}/${player.maxHealth}`;
    staminaFill.style.width = (player.stamina / player.maxStamina * 100) + '%';
    ammoText.textContent = `${player.ammo}/${player.maxAmmo}`;

    // Change color if low on ammo
    if (player.ammo === 0) {
        ammoText.style.color = '#ff0000';
    } else if (player.ammo < 10) {
        ammoText.style.color = '#ffaa00';
    } else {
        ammoText.style.color = '#ffd700';
    }
}

function updateStats() {
    document.querySelector('#kills span').textContent = gameState.enemiesDefeated;
    updateWaveUI();
}

function checkVictory() {
    const allDead = [...enemies, ...dragons].every(e => e.dead);
    if (allDead && gameState.running && gameState.waveActive) {
        gameState.waveActive = false;

        if (gameState.currentWave >= gameState.totalWaves) {
            // Final victory
            victory();
        } else {
            // Next wave
            gameState.currentWave++;
            showWaveComplete();
        }
    }
}

function showWaveComplete() {
    const waveStatus = document.getElementById('wave-status');
    waveStatus.textContent = `Wave ${gameState.currentWave - 1} Complete! Next wave in 3...`;
    waveStatus.style.color = '#00ff00';
    waveStatus.style.fontSize = '20px';
    waveStatus.style.fontWeight = 'bold';

    let countdown = 3;
    const interval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            waveStatus.textContent = `Wave ${gameState.currentWave - 1} Complete! Next wave in ${countdown}...`;
        } else {
            waveStatus.textContent = '';
            spawnWave(gameState.currentWave);
            clearInterval(interval);
        }
    }, 1000);
}

function updateWaveUI() {
    document.getElementById('current-wave').textContent = gameState.currentWave;
    document.getElementById('total-waves').textContent = gameState.totalWaves;

    const waveStatus = document.getElementById('wave-status');
    const enemyCount = enemies.filter(e => !e.dead).length + dragons.filter(d => !d.dead).length;
    waveStatus.textContent = `Enemies: ${enemyCount}`;
    waveStatus.style.color = '#ff6666';
    waveStatus.style.fontSize = '16px';
}

// ==================== GAME STATES ====================
function startGame() {
    gameState.running = true;
    gameState.screen = 'playing';
    gameState.enemiesDefeated = 0;
    gameState.currentWave = 1;
    gameState.waveActive = false;

    // Hide menus
    document.getElementById('menu').classList.remove('active');
    document.getElementById('game-over').classList.remove('active');
    document.getElementById('victory').classList.remove('active');

    // Create player
    if (player) {
        scene.remove(player.mesh);
    }
    player = new Player();

    // Spawn first wave
    spawnWave(gameState.currentWave);

    updateResourceBars();
    updateStats();

    // Request pointer lock
    setTimeout(() => {
        renderer.domElement.requestPointerLock();
    }, 100);

    // Start game loop
    gameLoop();
}

function gameOver() {
    gameState.running = false;
    gameState.screen = 'gameover';
    document.getElementById('game-over').classList.add('active');
    document.exitPointerLock();
}

function victory() {
    gameState.running = false;
    gameState.screen = 'victory';
    document.getElementById('final-stats').textContent = `Enemies Defeated: ${gameState.enemiesDefeated}`;
    document.getElementById('victory').classList.add('active');
    document.exitPointerLock();
}

function togglePause() {
    gameState.paused = !gameState.paused;
    if (gameState.paused) {
        gameState.running = false;
        document.exitPointerLock();
    } else {
        gameState.running = true;
        renderer.domElement.requestPointerLock();
        gameLoop();
    }
}

// ==================== GAME LOOP ====================
let lastTime = 0;
const fixedTimeStep = 1 / 60; // 60 FPS
let accumulator = 0;

function gameLoop() {
    if (!gameState.running) return;

    const currentTime = clock.getElapsedTime();
    let deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Cap delta time to prevent spiral of death
    if (deltaTime > 0.25) deltaTime = 0.25;

    accumulator += deltaTime;

    // Fixed timestep updates
    while (accumulator >= fixedTimeStep) {
        update(fixedTimeStep);
        accumulator -= fixedTimeStep;
    }

    // Render
    renderer.render(scene, camera);

    requestAnimationFrame(gameLoop);
}

function update(delta) {
    if (!player) return;

    const time = clock.getElapsedTime();

    // Update player
    player.update(delta);

    // Update enemies
    enemies.forEach(enemy => enemy.update(delta, player.mesh.position));

    // Update dragons
    dragons.forEach(dragon => dragon.update(delta, player.mesh.position, time));

    // Update ammo pickups
    ammoPickups.forEach(ammo => {
        if (!ammo.collected) {
            ammo.update(delta, time);
        }
    });

    // Clean up collected ammo
    ammoPickups = ammoPickups.filter(a => !a.collected);
}

// ==================== EVENT LISTENERS ====================
document.getElementById('start-btn').addEventListener('click', startGame);

document.getElementById('controls-btn').addEventListener('click', () => {
    document.getElementById('menu').classList.remove('active');
    document.getElementById('controls-screen').classList.add('active');
});

document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('controls-screen').classList.remove('active');
        document.getElementById('menu').classList.add('active');
    });
});

document.querySelectorAll('.restart-btn').forEach(btn => {
    btn.addEventListener('click', startGame);
});

// ==================== MOBILE CONTROLS ====================
function initMobileControls() {
    const joystickContainer = document.getElementById('joystick-container');
    const joystickStick = document.getElementById('joystick-stick');
    const shootBtn = document.getElementById('shoot-btn');
    const jumpBtn = document.getElementById('jump-btn');

    let joystickStartPos = { x: 40, y: 40 };
    const maxDistance = 40;

    // Joystick touch handling
    joystickStick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        mobileInput.joystick.active = true;
    });

    joystickStick.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!mobileInput.joystick.active) return;

        const touch = e.touches[0];
        const rect = joystickContainer.getBoundingClientRect();
        const centerX = rect.left + 75;
        const centerY = rect.top + 75;

        let deltaX = touch.clientX - centerX;
        let deltaY = touch.clientY - centerY;

        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            deltaX = Math.cos(angle) * maxDistance;
            deltaY = Math.sin(angle) * maxDistance;
        }

        joystickStick.style.left = (40 + deltaX) + 'px';
        joystickStick.style.top = (40 + deltaY) + 'px';

        mobileInput.joystick.x = deltaX / maxDistance;
        mobileInput.joystick.y = deltaY / maxDistance;
    });

    joystickStick.addEventListener('touchend', (e) => {
        e.preventDefault();
        mobileInput.joystick.active = false;
        mobileInput.joystick.x = 0;
        mobileInput.joystick.y = 0;
        joystickStick.style.left = '40px';
        joystickStick.style.top = '40px';
    });

    // Shoot button
    shootBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        mobileInput.shoot = true;
        if (player && gameState.running) {
            player.attack();
        }
    });

    shootBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        mobileInput.shoot = false;
    });

    // Jump button
    jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        mobileInput.jump = true;
        if (player && gameState.running) {
            player.jump();
        }
    });

    jumpBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        mobileInput.jump = false;
    });

    // Touch look controls (swipe on screen)
    let lastTouchX = 0;
    let lastTouchY = 0;
    let touchLookActive = false;

    renderer.domElement.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1 && gameState.running) {
            touchLookActive = true;
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
        }
    });

    renderer.domElement.addEventListener('touchmove', (e) => {
        if (touchLookActive && e.touches.length === 1 && player) {
            const sensitivity = 0.003;
            const deltaX = e.touches[0].clientX - lastTouchX;
            const deltaY = e.touches[0].clientY - lastTouchY;

            player.cameraRotation.yaw -= deltaX * sensitivity;
            player.cameraRotation.pitch -= deltaY * sensitivity;
            player.cameraRotation.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, player.cameraRotation.pitch));

            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
        }
    });

    renderer.domElement.addEventListener('touchend', () => {
        touchLookActive = false;
    });
}

// ==================== INITIALIZE ====================
initThreeJS();
createTerrain();
updateResourceBars();
updateStats();
initMobileControls();

