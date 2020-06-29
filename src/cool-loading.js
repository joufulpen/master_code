window.coolLoading = {
    mask: document.createElement('div'),
    loading: document.createElement('div'),
    hide: () => {
        document.body.removeChild(document.getElementsByClassName('cool-loading')[0])
        document.body.removeChild(document.getElementsByClassName('cool-loading-mask')[0])
        delete window.coolLoading
    }
}
window.coolLoading.mask.className = 'cool-loading-mask'
window.coolLoading.loading.className = 'cool-loading'
document.body.appendChild(window.coolLoading.mask)
document.body.appendChild(window.coolLoading.loading)