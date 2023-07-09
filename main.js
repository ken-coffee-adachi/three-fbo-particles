import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { vs_particles } from "./shader/vs_particles";
import { fs_particles } from "./shader/fs_particles";
import { fs_position } from "./shader/fs_position";
import { vs_depth } from "./shader/vs_depth";
import { fs_depth } from "./shader/fs_depth";

const width = 1024;
const height = 1024;

let container, stats;
let camera, scene, renderer, raycaster;
let roomMesh, particles, uniforms;
let gpuCompute, posVar;

const pointer = new THREE.Vector2();
const mouse = new THREE.Vector3(100, 100, 100);
const clock = new THREE.Clock(false);

const loader = new FontLoader();
loader.load("fonts/helvetiker_bold.typeface.json", function (font) {
  init(font);

  clock.start();
  animate();
});

function init(font) {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    1024
  );
  camera.position.set(0, 1.7, 4.5);

  camera.lookAt(scene.position);
  scene.add(camera);

  raycaster = new THREE.Raycaster();

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const shadowIntensity = 0.2;
  const light = new THREE.DirectionalLight(0xffffff, 1 - shadowIntensity);
  light.position.set(0, 2, 0);
  const light2 = light.clone();
  light2.intensity = shadowIntensity;
  light2.castShadow = true;
  scene.add(light);
  scene.add(light2);

  light2.shadow.mapSize.width = 1024;
  light2.shadow.mapSize.height = 1024;
  light2.shadow.camera.near = 0.5;
  light2.shadow.camera.far = 500;
  light2.shadow.camera.left = -5.12;
  light2.shadow.camera.bottom = -1.28;
  light2.shadow.camera.right = 5.12;
  light2.shadow.camera.top = 1.28;

  const backTexture = new THREE.TextureLoader().load("media/Back.png");
  const ceilingTexture = new THREE.TextureLoader().load("media/Ceiling.png");
  const floorTexture = new THREE.TextureLoader().load("media/Floor.png");
  const sideTexture = new THREE.TextureLoader().load("media/Side.png");
  const roomMaterials = [
    new THREE.MeshBasicMaterial({ map: sideTexture, side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: sideTexture, side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: ceilingTexture, side: THREE.BackSide }),
    new THREE.MeshPhongMaterial({ map: floorTexture, side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: backTexture, side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: backTexture, side: THREE.BackSide }),
  ];
  const roomGeometry = new THREE.BoxGeometry(10.24, 4, 10.24);
  roomMesh = new THREE.Mesh(roomGeometry, roomMaterials);
  roomMesh.receiveShadow = true;
  scene.add(roomMesh);

  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0, l = width * height; i < l; i++) {
    positions.push((i % width) / width);
    positions.push(Math.floor(i / width) / height);
    positions.push(0);
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  uniforms = {
    map: { value: null },
    width: { value: width },
    height: { value: height },
    pointSize: { value: 1.5 * window.devicePixelRatio },
    baseCol: { value: new THREE.Color(0.08, 0.11, 0.5) },
    posCol: { value: new THREE.Color(0.17, 0.29, 4) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vs_particles,
    fragmentShader: fs_particles,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });

  const depthMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vs_depth,
    fragmentShader: fs_depth,
    depthWrite: true,
    depthTest: true,
  });

  particles = new THREE.Points(geometry, material);
  particles.renderOrder = 1;
  particles.castShadow = true;
  particles.customDepthMaterial = depthMaterial;
  scene.add(particles);

  gpuCompute = new GPUComputationRenderer(width, height, renderer);
  const texture = gpuCompute.createTexture();
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  const textGeo = createGeometry(font);
  fillTexture(textGeo, texture);

  posVar = gpuCompute.addVariable("tPositions", fs_position, texture);
  gpuCompute.setVariableDependencies(posVar, [posVar]);
  posVar.material.uniforms.origin = { value: texture };
  posVar.material.uniforms.timer = { value: 0 };
  posVar.material.uniforms.mousePos = {
    value: new THREE.Vector4(100, 100, 100, 0),
  };

  const error = gpuCompute.init();
  if (error !== null) {
    console.error(error);
  }

  initGui();

  // const helper = new THREE.CameraHelper(light2.shadow.camera);
  // scene.add(helper);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.update();

  stats = new Stats();
  container.appendChild(stats.dom);

  document.addEventListener("mousemove", onPointerMove);
  window.addEventListener("resize", onWindowResize);
}

function createGeometry(font) {
  const geometry = new TextGeometry("THREE.JS", {
    font: font,
    size: 1.0,
    height: 0.25,
  });
  geometry.center();

  return geometry;
}

function fillTexture(geometry, texture) {
  const surfaceMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  const sampler = new MeshSurfaceSampler(surfaceMesh).build();

  let point = new THREE.Vector3();
  const data = texture.image.data;
  for (let i = 0, l = data.length; i < l; i += 4) {
    sampler.sample(point);
    data[i] = point.x;
    data[i + 1] = point.y;
    data[i + 2] = point.z;
    data[i + 3] = 0.0;
  }
}

function initGui() {
  const gui = new GUI();
  gui.close();

  const baseFolder = gui.addFolder("Base Color");
  baseFolder.add(uniforms.baseCol.value, "r", 0, 2, 0.01);
  baseFolder.add(uniforms.baseCol.value, "g", 0, 2, 0.01);
  baseFolder.add(uniforms.baseCol.value, "b", 0, 2, 0.01);

  const posFolder = gui.addFolder("Positional Color");
  posFolder.add(uniforms.posCol.value, "r", 0, 10, 0.01);
  posFolder.add(uniforms.posCol.value, "g", 0, 10, 0.01);
  posFolder.add(uniforms.posCol.value, "b", 0, 10, 0.1);
}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setMousePos() {
  camera.updateMatrixWorld();

  raycaster.setFromCamera(pointer, camera);
  const k = -raycaster.ray.origin.z / raycaster.ray.direction.z;
  mouse
    .copy(raycaster.ray.direction)
    .multiplyScalar(k)
    .add(raycaster.ray.origin);

  posVar.material.uniforms.mousePos.value.set(mouse.x, mouse.y, mouse.z, 0.2);
}

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const elapsed = clock.getElapsedTime();
  posVar.material.uniforms.timer.value = elapsed * 0.25 + 0.5;
  gpuCompute.compute();

  uniforms.map.value = gpuCompute.getCurrentRenderTarget(posVar).texture;

  setMousePos();

  renderer.render(scene, camera);
}
