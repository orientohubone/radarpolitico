import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile } from 'node:fs/promises'

const dossierPath = new URL('./dossi_a_esquerda_brasileira_radar_pol_tico.html', import.meta.url)

function dossierAsset() {
  return {
    name: 'radar-dossier-asset',
    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'dossies/esquerda-brasileira/index.html',
        source: await readFile(dossierPath, 'utf8'),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), dossierAsset()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/dossies/esquerda-brasileira': 'http://localhost:4000',
    }
  }
})
