import './globals.css'

export const metadata = {
  title: 'AI Clone Studio',
  description: 'Transform your selfie into professional AI videos',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-dark">
        {children}
      </body>
    </html>
  )
}
