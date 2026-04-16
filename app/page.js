import WeatherDashboard from '@/components/WeatherDashboard'

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-start px-0 py-2 sm:px-3 sm:py-4">
      <WeatherDashboard />
    </main>
  )
}
