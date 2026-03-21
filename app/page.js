import WeatherDashboard from '@/components/WeatherDashboard'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-100 px-4 py-10">
      <WeatherDashboard />
    </main>
  )
}
