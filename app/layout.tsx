import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "react-hot-toast"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
    title: "Oastel Admin",
    description: "Administration panel for Oastel tours and transfers",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={`${inter.className} antialiased`}>
                {children}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: "#363636",
                            color: "#fff",
                        },
                        success: {
                            duration: 3000,
                            style: {
                                background: "#10b981",
                                color: "#fff",
                            },
                        },
                        error: {
                            duration: 4000,
                            style: {
                                background: "#ef4444",
                                color: "#fff",
                            },
                        },
                    }}
                />
            </body>
        </html>
    )
}
