import './globals.css'

export const metadata = {
  title: 'Can I Go Boating Today?',
  description: 'A U.S.-focused boating forecast app using NWS forecasts, NOAA tide data, and radar.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body>{children}</body>
    </html>
  )
}
