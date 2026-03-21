import './globals.css'

export const metadata = {
  title: 'Boating Forecast',
  description: 'A weather forecast app for boaters.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#007bff" />
      </head>
      <body>{children}</body>
    </html>
  )
}
