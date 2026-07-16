const root = document.querySelector<HTMLDivElement>('#app')
if (!root) throw new Error('missing #app mount element')

root.textContent = 'Chess Position Editor'
