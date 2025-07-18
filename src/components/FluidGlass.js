/*
  Enhanced Portfolio Component with 3D Glass Effect
  Optimized for GitHub Pages deployment
*/

/* eslint-disable react/no-unknown-property */
import * as THREE from "three";
import { useRef, useState, useEffect, memo } from "react";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import {
  useFBO,
  useGLTF,
  useScroll,
  useTexture,
  Scroll,
  Preload,
  ScrollControls,
  MeshTransmissionMaterial,
  Text,
} from "@react-three/drei";
import { easing } from "maath";

export default function FluidGlass({
  mode = "lens",
  lensProps = {},
  barProps = {},
  cubeProps = {},
}) {
  const Wrapper = mode === "bar" ? Bar : mode === "cube" ? Cube : Lens;
  const rawOverrides =
    mode === "bar" ? barProps : mode === "cube" ? cubeProps : lensProps;

  const {
    navItems = [
      { label: "Home", link: "#home" },
      { label: "About", link: "#about" },
      { label: "Contact", link: "#contact" },
    ],
    ...modeProps
  } = rawOverrides;

  return (
    <Canvas camera={{ position: [0, 0, 20], fov: 15 }} gl={{ alpha: true }}>
      <ScrollControls damping={0.2} pages={3} distance={0.4}>
        {mode === "bar" && <NavItems items={navItems} />}
        <Wrapper modeProps={modeProps}>
          <Scroll>
            <Typography />
            <Images />
          </Scroll>
          <Scroll html />
          <Preload />
        </Wrapper>
      </ScrollControls>
    </Canvas>
  );
}

const ModeWrapper = memo(function ModeWrapper({
  children,
  glb,
  geometryKey,
  lockToBottom = false,
  followPointer = true,
  modeProps = {},
  ...props
}) {
  const ref = useRef();
  const { nodes } = useGLTF(glb);
  const { viewport } = useThree();
  const buffer = useFBO({ width: viewport.width * 4, height: viewport.height * 4 });
  const [scene] = useState(() => new THREE.Scene());
  const geoWidthRef = useRef(1);

  useEffect(() => {
    const geo = nodes[geometryKey]?.geometry;
    if (geo) {
      geo.computeBoundingBox();
      geoWidthRef.current = geo.boundingBox.max.x - geo.boundingBox.min.x || 1;
    }
  }, [nodes, geometryKey]);

  useFrame((state, delta) => {
    const { gl, viewport, pointer, camera } = state;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);

    const destX = followPointer ? (pointer.x * v.width) / 2 : 0;
    const destY = lockToBottom
      ? -v.height / 2 + 0.2
      : followPointer
        ? (pointer.y * v.height) / 2
        : 0;
    easing.damp3(ref.current.position, [destX, destY, 15], 0.15, delta);

    if (modeProps.scale == null) {
      const maxWorld = v.width * 0.9;
      const desired = maxWorld / geoWidthRef.current;
      ref.current.scale.setScalar(Math.min(0.15, desired));
    }

    gl.setRenderTarget(buffer);
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    gl.setClearColor(0x1200ff, 1);
  });

  const {
    scale,
    ior,
    thickness,
    anisotropy,
    chromaticAberration,
    ...extraMat
  } = modeProps;

  return (
    <>
      {createPortal(children, scene)}
      <mesh scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} transparent />
      </mesh>
      <mesh
        ref={ref}
        scale={scale ?? 0.15}
        rotation-x={Math.PI / 2}
        geometry={nodes[geometryKey]?.geometry}
        {...props}
      >
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          ior={ior ?? 1.15}
          thickness={thickness ?? 5}
          anisotropy={anisotropy ?? 0.01}
          chromaticAberration={chromaticAberration ?? 0.1}
          {...extraMat}
        />
      </mesh>
    </>
  );
});

function Lens({ modeProps, ...p }) {
  return (
    <ModeWrapper
      glb="/assets/3d/lens.glb"
      geometryKey="Cylinder"
      followPointer
      modeProps={modeProps}
      {...p}
    />
  );
}

function Cube({ modeProps, ...p }) {
  return (
    <ModeWrapper
      glb="/assets/3d/cube.glb"
      geometryKey="Cube"
      followPointer
      modeProps={modeProps}
      {...p}
    />
  );
}

function Bar({ modeProps = {}, ...p }) {
  const defaultMat = {
    transmission: 1,
    roughness: 0,
    thickness: 10,
    ior: 1.15,
    color: "#ffffff",
    attenuationColor: "#ffffff",
    attenuationDistance: 0.25,
  };

  return (
    <ModeWrapper
      glb="/assets/3d/bar.glb"
      geometryKey="Cube"
      lockToBottom
      followPointer={false}
      modeProps={{ ...defaultMat, ...modeProps }}
      {...p}
    />
  );
}

function NavItems({ items }) {
  const group = useRef();
  const { viewport, camera } = useThree();

  const DEVICE = {
    mobile: { max: 639, spacing: 0.2, fontSize: 0.035 },
    tablet: { max: 1023, spacing: 0.24, fontSize: 0.045 },
    desktop: { max: Infinity, spacing: 0.3, fontSize: 0.045 },
  };

  const getDevice = () => {
    const w = window.innerWidth;
    return w <= DEVICE.mobile.max
      ? "mobile"
      : w <= DEVICE.tablet.max
        ? "tablet"
        : "desktop";
  };

  const [device, setDevice] = useState(getDevice());

  useEffect(() => {
    const onResize = () => setDevice(getDevice());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { spacing, fontSize } = DEVICE[device];

  useFrame(() => {
    if (!group.current) return;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);
    group.current.position.set(0, -v.height / 2 + 0.2, 15.1);

    group.current.children.forEach((child, i) => {
      child.position.x = (i - (items.length - 1) / 2) * spacing;
    });
  });

  const handleNavigate = (link) => {
    if (!link) return;
    link.startsWith("#")
      ? (window.location.hash = link)
      : (window.location.href = link);
  };

  return (
    <group ref={group} renderOrder={10}>
      {items.map(({ label, link }) => (
        <Text
          key={label}
          fontSize={fontSize}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="/assets/fonts/figtreeblack.ttf"
          depthWrite={false}
          outlineWidth={0}
          outlineBlur="20%"
          outlineColor="#000"
          outlineOpacity={0.5}
          depthTest={false}
          renderOrder={10}
          onClick={(e) => {
            e.stopPropagation();
            handleNavigate(link);
          }}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "auto")}
        >
          {label}
        </Text>
      ))}
    </group>
  );
}

const ImageWithAspectRatio = memo(({ url, position, desiredWidth, desiredHeight, index, selectedImage, onImageClick, ...props }) => {
  const texture = useTexture(url);
  const { viewport, camera } = useThree();
  const aspectRatio = texture.image.width / texture.image.height;
  const meshRef = useRef();
  const [isHovered, setIsHovered] = useState(false);
  const scroll = useScroll();

  let scaleX, scaleY;
  const isSelected = selectedImage === index;

  if (desiredWidth) {
    scaleX = desiredWidth;
    scaleY = desiredWidth / aspectRatio;
  } else if (desiredHeight) {
    scaleY = desiredHeight;
    scaleX = desiredHeight * aspectRatio;
  } else {
    scaleX = viewport.width * 0.4;
    scaleY = scaleX / aspectRatio;
  }

  const maxScaleFactor = Math.min(viewport.width / scaleX, viewport.height / scaleY, 1);
  scaleX *= maxScaleFactor;
  scaleY *= maxScaleFactor;

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (isSelected) {
      const scrollY = scroll.offset * (scroll.pages - 1) * viewport.height;
      const v = viewport.getCurrentViewport(camera, [0, 0, 15]);
      const targetX = 0;
      const targetY = -scrollY;

      easing.damp3(meshRef.current.position, [targetX, targetY, 15], 0.3, delta);

      const maxWidth = v.width * 0.8;
      const maxHeight = v.height * 0.8;

      let targetScaleX = scaleX;
      let targetScaleY = scaleY;

      if (targetScaleX > maxWidth) {
        targetScaleX = maxWidth;
        targetScaleY = maxWidth / aspectRatio;
      }
      if (targetScaleY > maxHeight) {
        targetScaleY = maxHeight;
        targetScaleX = maxHeight * aspectRatio;
      }

      easing.damp3(meshRef.current.scale, [targetScaleX, targetScaleY, 1], 0.3, delta);
    } else {
      const time = state.clock.elapsedTime;
      const floatOffsetX = Math.sin(time * 0.4 + index * 0.5) * 0.1;
      const floatOffsetY = Math.cos(time * 0.3 + index * 0.08);
      const floatOffsetZ = Math.sin(time * 0.5 + index * 0.7) * 0.2;

      const targetPosition = [
        position[0] + floatOffsetX,
        position[1] + floatOffsetY,
        position[2] + floatOffsetZ
      ];

      easing.damp3(meshRef.current.position, targetPosition, 0.1, delta);
      easing.damp3(meshRef.current.scale, [scaleX, scaleY, 1], 0.3, delta);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onImageClick(index);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setIsHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setIsHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={1}
      />
    </mesh>
  );
});

function Images() {
  const group = useRef();
  const scroll = useScroll();
  const { height, width } = useThree((s) => s.viewport);
  const [selectedImage, setSelectedImage] = useState(null);

  // Placeholder images - du kannst diese später durch deine eigenen ersetzen
  const imageConfig = [
    { url: "/assets/images/bild3.png", position: [-width * 0.32, -height * 0.1, 0.8], desiredWidth: width * 0.32 },
    { url: "/assets/images/obst2.png", position: [width * 0.38, -height * 0.25, -0.2], desiredWidth: width * 0.36 },
    { url: "/assets/images/bild1.png", position: [-width * 0.18, -height * 0.48, 1.2], desiredWidth: width * 0.4 },
    { url: "/assets/images/obst4.png", position: [width * 0.42, -height * 0.72, -1.1], desiredWidth: width * 0.3 },
    { url: "/assets/images/obst1.png", position: [-width * 0.4, -height * 0.95, 0.5], desiredWidth: width * 0.34 },
    { url: "/assets/images/bild4.png", position: [width * 0.22, -height * 1.22, -0.8], desiredWidth: width * 0.38 },
    { url: "/assets/images/obst3.png", position: [-width * 0.35, -height * 1.52, 0.3], desiredWidth: width * 0.37 },
    { url: "/assets/images/bild2.png", position: [width * 0.28, -height * 1.82, -0.5], desiredWidth: width * 0.4 },
  ];

  const handleImageClick = (index) => {
    setSelectedImage(selectedImage === index ? null : index);
  };

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (e.target.tagName === 'CANVAS') {
        setSelectedImage(null);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
      }
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <group ref={group}>
      {selectedImage !== null && (
        <mesh
          position={[0, -scroll.offset * (scroll.pages - 1) * height, 14]}
          scale={[width * 4, height * 4, 1]}
        >
          <planeGeometry />
          <meshBasicMaterial color="#000000" transparent opacity={0.8} />
        </mesh>
      )}

      {imageConfig.map((config, index) => (
        <ImageWithAspectRatio
          key={index}
          index={index}
          url={config.url}
          position={config.position}
          desiredWidth={config.desiredWidth}
          desiredHeight={config.desiredHeight}
          selectedImage={selectedImage}
          onImageClick={handleImageClick}
        />
      ))}
    </group>
  );
}

function Typography() {
  const scroll = useScroll();
  const { viewport } = useThree();

  const DEVICE = {
    mobile: {
      titleFontSize: 0.2 * 0.75,
      smallFontSize: 0.1 * 0.75,
    },
    tablet: {
      titleFontSize: 0.32 * 0.75,
      smallFontSize: 0.12 * 0.75,
    },
    desktop: {
      titleFontSize: 0.56 * 0.75,
      smallFontSize: 0.15 * 0.75,
    },
  };

  const getDevice = () => {
    const w = window.innerWidth;
    return w <= 639 ? "mobile" : w <= 1023 ? "tablet" : "desktop";
  };

  const [device, setDevice] = useState(getDevice());

  useEffect(() => {
    const onResize = () => setDevice(getDevice());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { titleFontSize } = DEVICE[device];

  const scrollProgress = scroll.offset;
  const titleOpacity = Math.max(0, 1 - scrollProgress * 4);

  return (
    <Text
      position={[0, 0, 12]}
      font="/assets/fonts/figtreeblack.ttf"
      fontSize={titleFontSize}
      letterSpacing={-0.05}
      outlineWidth={0}
      outlineBlur="20%"
      outlineColor="#000"
      outlineOpacity={0.5}
      color="white"
      anchorX="center"
      anchorY="middle"
      material-opacity={titleOpacity}
      visible={titleOpacity > 0}
    >
      Design Portfolio
    </Text>
  );
}
