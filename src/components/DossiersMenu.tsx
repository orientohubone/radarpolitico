import React from 'react'

export default function DossiersMenu() {
  return <details className="dossiers-menu">
    <summary>Dossiês</summary>
    <div className="dossiers-dropdown">
      <small>Espectro político brasileiro</small>
      <a className="available" href="/dossies/esquerda-brasileira"><span>Esquerda brasileira</span><b>Acessar →</b></a>
      <span><span>Centro político</span><b>Em preparação</b></span>
      <span><span>Direita brasileira</span><b>Em preparação</b></span>
    </div>
  </details>
}
