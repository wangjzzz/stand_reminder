import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'
import './pet.css'
import './pet-picker.css'

if (location.hash === '#pet') document.documentElement.classList.add('pet-mode')

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
