import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/rest': {
                target: 'https://apiconnect.angelbroking.com',
                changeOrigin: true,
                secure: false,
            }
        }
    }
})
