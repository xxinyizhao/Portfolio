const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

document.querySelectorAll("[data-dialog]").forEach((card) => {
  card.addEventListener("click", () => {
    const dialog = document.querySelector(`#${card.dataset.dialog}`);
    dialog?.showModal();
    const stepViewer = dialog?.querySelector(".step-viewer");
    if (stepViewer) initializeStepViewer(stepViewer);
  });
});

document.querySelectorAll(".dialog-close").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

const experienceSlides = [...document.querySelectorAll(".experience-slide")];
const experienceTrack = document.querySelector(".experience-track");
const previousSlideButton = document.querySelector(".slide-previous");
const nextSlideButton = document.querySelector(".slide-next");
const slideCounter = document.querySelector(".slide-counter");
const experienceGallery = document.querySelector(".experience-gallery");
let activeSlideIndex = 0;

function showExperienceSlide(nextIndex) {
  if (!experienceSlides.length) return;
  activeSlideIndex = (nextIndex + experienceSlides.length) % experienceSlides.length;
  experienceSlides.forEach((slide, index) => {
    const isActive = index === activeSlideIndex;
    slide.setAttribute("aria-hidden", String(!isActive));
  });
  if (experienceTrack) experienceTrack.style.transform = `translateX(-${activeSlideIndex * 100}%)`;
  if (slideCounter) slideCounter.textContent = `${activeSlideIndex + 1} / ${experienceSlides.length}`;
}

previousSlideButton?.addEventListener("click", () => showExperienceSlide(activeSlideIndex - 1));
nextSlideButton?.addEventListener("click", () => showExperienceSlide(activeSlideIndex + 1));
experienceGallery?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") showExperienceSlide(activeSlideIndex - 1);
  if (event.key === "ArrowRight") showExperienceSlide(activeSlideIndex + 1);
});
showExperienceSlide(0);

const stepViewerPromises = new WeakMap();

function initializeStepViewer(viewer) {
  if (stepViewerPromises.has(viewer)) return stepViewerPromises.get(viewer);
  const promise = loadStepViewer(viewer);
  stepViewerPromises.set(viewer, promise);
  return promise;
}

async function loadStepViewer(viewer) {
  const canvasHost = viewer?.querySelector(".step-canvas");
  const status = viewer?.querySelector(".step-status");
  if (!viewer || !canvasHost || !status) return;

  try {
    if (!window.THREE || !window.occtimportjs) throw new Error("The 3D viewer libraries could not be loaded.");
    const occt = await window.occtimportjs({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/${file}`
    });
    const response = await fetch(viewer.dataset.stepSrc);
    if (!response.ok) throw new Error(`Model request failed (${response.status}).`);
    const result = occt.ReadStepFile(new Uint8Array(await response.arrayBuffer()), null);
    if (!result.success || !result.meshes?.length) throw new Error("The STEP model did not contain displayable geometry.");

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080808);
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 100000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputEncoding = THREE.sRGBEncoding;
    canvasHost.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c0cc, 1.35));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(1, -2, 3);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.72);
    fillLight.position.set(-2, 1, 1);
    scene.add(fillLight);

    const model = new THREE.Group();
    result.meshes.forEach((source) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(source.attributes.position.array, 3));
      if (source.attributes.normal) geometry.setAttribute("normal", new THREE.Float32BufferAttribute(source.attributes.normal.array, 3));
      else geometry.computeVertexNormals();
      geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(source.index.array), 1));

      const meshName = (source.name || "").toLowerCase();
      let fallbackHex = 0xb8bcc2;
      if (/board|pcb|substrate|core/.test(meshName)) fallbackHex = 0x075aa8;
      else if (/connector|header|socket|molex|switch|button|pot/.test(meshName)) fallbackHex = 0x242629;
      else if (/resistor|diode|transistor|mosfet|fuse|ic|chip/.test(meshName)) fallbackHex = 0x34373b;
      else if (/capacitor|inductor/.test(meshName)) fallbackHex = 0xc59a35;
      else if (/led/.test(meshName)) fallbackHex = 0xd52b2b;
      const fallbackColor = new THREE.Color(fallbackHex);
      const meshColor = source.color
        ? new THREE.Color(source.color[0], source.color[1], source.color[2])
        : fallbackColor;
      const defaultMaterial = new THREE.MeshPhongMaterial({ color: meshColor, specular: 0, side: THREE.DoubleSide });
      const materials = [defaultMaterial];
      const faces = source.brep_faces || [];

      faces.forEach((face) => {
        const faceColor = face.color
          ? new THREE.Color(face.color[0], face.color[1], face.color[2])
          : meshColor;
        materials.push(new THREE.MeshPhongMaterial({ color: faceColor, specular: 0, side: THREE.DoubleSide }));
      });

      const triangleCount = source.index.array.length / 3;
      let triangleIndex = 0;
      let faceIndex = 0;
      while (triangleIndex < triangleCount) {
        const firstIndex = triangleIndex;
        let lastIndex;
        let materialIndex;

        if (faceIndex >= faces.length) {
          lastIndex = triangleCount;
          materialIndex = 0;
        } else if (triangleIndex < faces[faceIndex].first) {
          lastIndex = faces[faceIndex].first;
          materialIndex = 0;
        } else {
          lastIndex = faces[faceIndex].last + 1;
          materialIndex = faceIndex + 1;
          faceIndex += 1;
        }

        geometry.addGroup(firstIndex * 3, (lastIndex - firstIndex) * 3, materialIndex);
        triangleIndex = lastIndex;
      }

      model.add(new THREE.Mesh(geometry, materials.length > 1 ? materials : defaultMaterial));
    });
    scene.add(model);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    model.position.sub(center);
    const modelSize = Math.max(size.x, size.y, size.z) || 1;
    let cameraDistance = modelSize * 1.65;
    camera.position.set(0, -cameraDistance, cameraDistance * 0.7);
    camera.near = Math.max(modelSize / 1000, 0.01);
    camera.far = modelSize * 100;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);

    const render = () => renderer.render(scene, camera);

    const resize = () => {
      const width = canvasHost.clientWidth;
      const height = canvasHost.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };
    new ResizeObserver(resize).observe(canvasHost);
    resize();

    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    viewer.addEventListener("pointerdown", (event) => {
      dragging = true;
      previousX = event.clientX;
      previousY = event.clientY;
      viewer.setPointerCapture(event.pointerId);
    });
    viewer.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      model.rotation.y += (event.clientX - previousX) * 0.009;
      model.rotation.x += (event.clientY - previousY) * 0.009;
      previousX = event.clientX;
      previousY = event.clientY;
      render();
    });
    viewer.addEventListener("pointerup", (event) => {
      dragging = false;
      viewer.releasePointerCapture(event.pointerId);
    });
    viewer.addEventListener("wheel", (event) => {
      event.preventDefault();
      const scale = event.deltaY > 0 ? 1.1 : 0.9;
      cameraDistance = Math.min(modelSize * 5, Math.max(modelSize * 0.65, cameraDistance * scale));
      camera.position.setLength(cameraDistance);
      render();
    }, { passive: false });

    status.classList.add("is-hidden");
    render();
  } catch (error) {
    status.textContent = `3D model unavailable: ${error.message} Run the site through localhost instead of opening index.html directly.`;
  }
}
