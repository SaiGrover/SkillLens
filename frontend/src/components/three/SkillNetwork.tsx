import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, Stars } from '@react-three/drei'
import * as THREE from 'three'

const skillNodes = [
  { label: 'Python', pos: [0, 0, 0] as [number,number,number], color: '#a78bfa', size: 0.18 },
  { label: 'LLM', pos: [1.5, 1, 0.5] as [number,number,number], color: '#d8b4fe', size: 0.15 },
  { label: 'Rust', pos: [-1.5, 0.8, -0.5] as [number,number,number], color: '#34d399', size: 0.12 },
  { label: 'K8s', pos: [0.8, -1.2, 1] as [number,number,number], color: '#fb923c', size: 0.11 },
  { label: 'React', pos: [-0.8, -1, -1] as [number,number,number], color: '#f472b6', size: 0.13 },
  { label: 'AWS', pos: [1.2, -0.5, -1] as [number,number,number], color: '#fbbf24', size: 0.13 },
]

function Node({ node }: { node: typeof skillNodes[0] }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.5
  })
  return (
    <group position={node.pos}>
      <mesh ref={ref}>
        <sphereGeometry args={[node.size, 16, 16]} />
        <meshStandardMaterial color={node.color} emissive={node.color} emissiveIntensity={0.4} />
      </mesh>
      <Text position={[0, node.size + 0.12, 0]} fontSize={0.1} color={node.color} anchorX="center" anchorY="middle">
        {node.label}
      </Text>
    </group>
  )
}

function Connections() {
  const ThreeLine = 'line' as any
  const lines = useMemo(() => {
    const pairs = [[0,1],[0,2],[0,3],[1,3],[2,4],[3,5],[1,5]]
    return pairs.map(([a, b]) => {
      const start = new THREE.Vector3(...skillNodes[a].pos)
      const end = new THREE.Vector3(...skillNodes[b].pos)
      const points = [start, end]
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      return { geometry, key: `${a}-${b}` }
    })
  }, [])

  return (
    <>
      {lines.map(({ geometry, key }) => (
        <ThreeLine key={key} geometry={geometry}>
          <lineBasicMaterial color="#ffffff" opacity={0.08} transparent />
        </ThreeLine>
      ))}
    </>
  )
}

function RotatingGroup() {
  const groupRef = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (groupRef.current) groupRef.current.rotation.y = state.clock.elapsedTime * 0.08
  })
  return (
    <group ref={groupRef}>
      {skillNodes.map((node, i) => <Node key={i} node={node} />)}
      <Connections />
    </group>
  )
}

export default function SkillNetwork() {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 60 }}>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#a78bfa" />
      <Stars radius={100} depth={50} count={2000} factor={3} saturation={0} fade speed={0.5} />
      <RotatingGroup />
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  )
}
