import WeatherDashboard from '@/components/WeatherDashboard'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-10 md:px-6">
      <WeatherDashboard />
    </main>
  )
}
