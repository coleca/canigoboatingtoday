// components/DynamicRadarMap.js
import dynamic from 'next/dynamic'

// Use next/dynamic to create a component that is only loaded on the client side.
// The `ssr: false` option is crucial for libraries that depend on the browser's `window` object.
const DynamicRadarMap = dynamic(() => import('./RadarMap'), {
  ssr: false,
})

export default DynamicRadarMap
