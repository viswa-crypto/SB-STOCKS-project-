import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";

const COLORS = ["#2FE6A6", "#D9B25C", "#FF5C7A", "#5C9BFF", "#B85CFF", "#F5A623"];

function Node({ position, color, scale }) {
  const ref = useRef();
  useFrame((state) => {
    ref.current.scale.setScalar(scale * (1 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.06));
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.16, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.3} metalness={0.5} />
    </mesh>
  );
}

function Globe({ sectors }) {
  const group = useRef();
  useFrame((_, delta) => {
    group.current.rotation.y += delta * 0.15;
  });

  const nodes = useMemo(() => {
    return sectors.map((s, i) => {
      const phi = Math.acos(-1 + (2 * i) / Math.max(sectors.length, 1));
      const theta = Math.sqrt(sectors.length * Math.PI) * phi;
      const r = 1.6;
      return {
        position: [r * Math.cos(theta) * Math.sin(phi), r * Math.sin(theta) * Math.sin(phi), r * Math.cos(phi)],
        color: COLORS[i % COLORS.length],
        scale: 0.6 + s.weight * 1.4,
      };
    });
  }, [sectors]);

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[1.6, 24, 24]} />
        <meshBasicMaterial color="#2FE6A6" wireframe transparent opacity={0.12} />
      </mesh>
      {nodes.map((n, i) => (
        <Node key={i} {...n} />
      ))}
    </group>
  );
}

// sectors: [{ name, weight (0-1) }]
export default function PortfolioGlobe({ sectors = [] }) {
  const safeSectors = sectors.length ? sectors : [{ name: "—", weight: 1 }];
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.6} />
        <pointLight position={[4, 4, 4]} intensity={1.5} color="#2FE6A6" />
        <pointLight position={[-4, -2, -4]} intensity={0.8} color="#D9B25C" />
        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
          <Globe sectors={safeSectors} />
        </Float>
      </Canvas>
    </div>
  );
}
