/**
 * @author LiJingliang
 * @name cool-master
 * @description 带loading样式的，可配置异步样式/脚本加载工具，方便集中化管理公共加载项
 */
//定义临时变量，完成时将会清除，避免全局污染
window.coolMaster = {}
//获取所有已加载脚本标签
coolMaster.scripts = document.getElementsByTagName('script')
//取最后一项（即当前正在运行的），并保存src
coolMaster.src = coolMaster.scripts[coolMaster.scripts.length - 1].getAttribute('src')
//去除最后一个/起的文件名，即获得路径
coolMaster.prefix = coolMaster.src.substring(0, coolMaster.src.lastIndexOf('/'))
//如果js和html放一起，则需要补一个/
if (coolMaster.prefix.length > 0) coolMaster.prefix += '/'
//如果不是全路径
if (coolMaster.prefix.indexOf('://') < 0) {
  //如果是根路径，直接补html的域名端口部分
  if (coolMaster.prefix.substr(0, 1) === '/') coolMaster.prefix = window.location.protocol + '//' + window.location.host + coolMaster.prefix
  //否则相对路径，就用html的路径补全
  else coolMaster.prefix = window.location.href.substring(0, window.location.href.lastIndexOf('/')) + '/' + coolMaster.prefix
}
//取html链接
coolMaster.src = window.location.href.split('?')[0].split('#')[0]
//用/拆分
coolMaster.splited = coolMaster.src.split('/')
//取出最后一截
coolMaster.last = coolMaster.splited[coolMaster.splited.length - 1]
//如果是空的补index（这里只考虑index的情况，default之类的不管了）
if (coolMaster.last === '') coolMaster.page = coolMaster.src + 'index'
else {
  //文件名抽出去并把后缀去掉
  coolMaster.last = coolMaster.splited.splice(-1)[0].split('.')[0]
  //重新拼起来，方便以后加.js或者.css
  coolMaster.page = coolMaster.splited.join('/') + '/' + coolMaster.last
}

//此函数用于加载polyfill后回调
coolMaster.next = () => {
  //因为未加载axios之类，简单封装一个原生的ajax
  coolMaster.ajaxGet = url =>
    new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest()
      //ajax过程报错的话直接调用reject回调函数，告知promise
      xhr.onerror = e => reject(e)
      //ajax返回加载完毕的回调函数
      xhr.onload = e => {
        //只有200是正确加载，否则都要reject给promise
        if (e.target.status !== 200) return reject(e.target)
        //使用resole回调函数告知promise执行成功结果
        return resolve(e.target.response)
      }
      //打开ajax请求，传入参数
      xhr.open('get', url, true)
      //发送ajax请求
      xhr.send()
    })

  //加载本地文件
  coolMaster.loadLocal = (coolMaster, name) => {
    coolMaster.ajaxGet(name).then(resp => (window.coolLocals[name] = resp))
  }

  //加载样式函数
  coolMaster.loadStyle = url => {
    let link = window.document.createElement('link')
    link.rel = 'stylesheet'
    link.href = url
    window.document.head.appendChild(link)
  }
  //立即加载loading样式
  coolMaster.loadStyle(coolMaster.prefix + 'cool-loading.css')

  //预加载函数
  coolMaster.preload = (url, prefix) => {
    if (url === undefined) return
    prefix = prefix ? prefix : ''
    url = url.includes('://') ? url : prefix + url
    //只有chrome支持preload，优化得最好
    let link = window.document.createElement('link')
    link.rel = 'preload'
    link.href = url
    //preload没有as的话会失败，类型和mime不对又会出警告，暂时只支持三种类型
    if (url.endsWith('.js') || url.endsWith('/AppURL/GetAll')) link.as = 'script'
    if (url.endsWith('.css')) link.as = 'style'
    if (url.endsWith('.woff')) {
      link.as = 'font'
      //字体需要有CORS
      link.crossOrigin = 'anonymous'
    }
    window.document.head.appendChild(link)
  }
  //马上预加载loading脚本
  coolMaster.preload('cool-loading.js', coolMaster.prefix)

  //预加载所有后加载标签的函数
  coolMaster.preloadPosts = coolMaster => {
    //获取所有script标签
    let tags = Array.from(document.getElementsByTagName('script')).filter(tag => tag.getAttribute('type') === 'post-load')
    if (tags.length === 0) return
    tags.forEach(tag => coolMaster.preload(tag.outerHTML.split('src="')[1].split('"')[0], coolMaster.prefix))
  }

  //加载cool-master.json的函数
  coolMaster.loadJson = coolMaster =>
    //为网络返回结果异步执行创建promise
    new Promise(resolve => {
      //若已预加载则等待加载完才返回
      if (coolMaster.resp) {
        var token = setInterval(() => {
          if (coolMaster.resp != 'waiting') {
            clearInterval(token)
            return resolve(coolMaster.resp)
          }
        })
      } else {
        //设置等待状态
        coolMaster.resp = 'waiting'
        coolMaster.ajaxGet(coolMaster.prefix + 'cool-master.json').then(r => {
          let resp = JSON.parse(r)
          //preload所有json中的样式和脚本
          if (window.extraJsons) window.extraJsons.forEach(p => coolMaster.loadLocal(coolMaster, p))
          if (window.coolLocals) resp.locals.forEach(p => coolMaster.loadLocal(coolMaster, p))
          resp.styles.forEach(p => coolMaster.preload(p, coolMaster.prefix))
          resp.singleScripts.forEach(p => coolMaster.preload(p, coolMaster.prefix))
          resp.scripts.forEach(p => coolMaster.preload(p, coolMaster.prefix))
          resp.preloads.forEach(p => coolMaster.preload(p, coolMaster.prefix))
          //预加载所有后加载标签
          coolMaster.preloadPosts(coolMaster)
          //预加载页面同名脚本
          coolMaster.preload(coolMaster.page + '.js')
          // coolMaster.preload(coolMaster.page + '.css')
          //预加载后缓存json的内容，正式使用的时候直接返回
          coolMaster.resp = resp
        })
      }
    })
  //马上执行加载json，此处为启动预加载
  coolMaster.loadJson(coolMaster)

  //创建一个style标签，用于隐藏整个页面，避免loading圈圈出现前出现未渲染内容
  coolMaster.tag = document.createElement('style')
  //给个id方便删除
  coolMaster.tag.id = 'hideAll'
  //用css筛选器让body里所有元素都隐藏
  coolMaster.tag.innerText = 'body>*{visibility:hidden}'
  document.head.appendChild(coolMaster.tag)

  //添加一个document的DOMContentLoaded事件，不建议直接window.onload = ，这样会覆盖原有的事件
  coolMaster.load = () => {
    //用函数内部变量代替全局变量
    let _coolMaster = coolMaster
    //清除全局变量避免污染
    delete window.coolMaster

    //加载脚本的函数
    let loadScript = name =>
      //脚本存在加载顺序，所以创建promise，以便用回调链按顺序调用
      new Promise((resolve, reject) => {
        if (name === undefined) return resolve()
        //创建script标签
        let scriptTag = window.document.createElement('script')
        //组装src，区分含//的
        scriptTag.src = name.includes('://') ? name : _coolMaster.prefix + name
        //script也有onload事件，加载成功后回调通知promise
        scriptTag.onload = resolve
        //加载出错的时候也要通知
        scriptTag.onerror = () => reject()
        //某些浏览器版本，head执行完后再往里写script是无效的，所以写到body里
        window.document.head.appendChild(scriptTag)
      })

    //顺序加载多个脚本的函数
    let loadScripts = names => {
      //总要有个启动的prmise（这里隐含一个条件，就是json里的scripts至少要有一项）
      let promise = loadScript(names[0])
      //将每个scipt加入promise的回调链里，其实这里应该用.then保证上一个加载成功，不过算了，加载不成功横竖都是报错
      for (let i = 1; i < names.length; i++) promise = promise.finally(() => loadScript(names[i]))
      //promise异步方法都要返回自身，以便回调链能接续下去
      return promise
    }

    //重新加载有src属性标签的函数，用于处理html中需要后加载的脚本
    let loadPost = tag =>
      //这些src往往都有依赖关系，创建promise方便按顺序加载
      new Promise((resolve, reject) => {
        if (tag === undefined) return resolve()
        //临时保存原来的父节点
        let parent = tag.parentNode
        //移除旧标签
        parent.removeChild(tag)
        //创建一个新的同类标签
        let newTag = document.createElement(tag.nodeName)
        //使用原来的src
        let src = tag.outerHTML.split('src="')[1].split('"')[0]
        newTag.src = src.includes('://') ? src : _coolMaster.prefix + src
        //加载成功通知promise
        newTag.onload = resolve
        //加载失败也。。。
        newTag.onerror = reject
        //将标签加回去原来的父节点里
        parent.appendChild(newTag)
      })

    //处理所有后加载标签的函数
    let loadPosts = () => {
      //获取所有script标签
      let tags = Array.from(document.getElementsByTagName('script')).filter(tag => tag.getAttribute('type') === 'post-load')
      //如果没有，则假模假式创建一个promise并马上异步完成
      if (tags.length === 0) return new Promise(resolve => resolve())
      //拿第一个重加载作为起点
      let promise = loadPost(tags[0])
      //构建回调链
      for (let i = 1; i < tags.length; i++) promise = promise.finally(() => loadPost(tags[i]))
      //返回回调链
      return promise
    }

    //load里面，先前都是在定义函数，这里才开始执行
    //异步链启动，先加载loading，让页面开始转圈圈
    loadScript('cool-loading.js')
      .then(() => {
        //loading有遮罩，就可以去掉临时的隐藏样式
        document.head.removeChild(document.getElementById('hideAll'))
        //第二次加载json，若之前启动那次已经完成，则会直接返回，否则等待直至加载完成
        return _coolMaster.loadJson(_coolMaster)
      })
      .then(resp => {
        //正式加载多个样式
        resp.styles.forEach(name => _coolMaster.loadStyle(name.includes('://') ? name : _coolMaster.prefix + name))
        // _coolMaster.loadStyle(page + '.css')
        //正式加载无顺序脚本
        return Promise.all([resp].concat(resp.singleScripts.map(script => loadScript(script))))
      })
      //正式加载有顺序脚本
      .then(([resp]) => loadScripts(resp.scripts))
      //正式加载html中后加载脚本
      .finally(() => loadPosts())
      //保证本地文件加载
      .finally(
        () =>
          new Promise(resolve => {
            if (window.coolLocals || window.extraJsons)
              var token = setInterval(() => {
                let length = _coolMaster.resp.locals.length + (window.extraJsons ? window.extraJsons.length : 0)
                if (Object.keys(window.coolLocals).length == length) {
                  clearInterval(token)
                  return resolve()
                }
              })
            else resolve()
          })
      )
      //正式加载页面同名js
      .finally(() => loadScript(_coolMaster.page + '.js'))
      //取消loading，异步链结束
      .finally(() => coolLoading.hide())
  }

  document.addEventListener('DOMContentLoaded', coolMaster.load)
}

//判断是否IE
if (!!window.ActiveXObject || 'ActiveXObject' in window) {
  //创建script标签
  let tag = document.createElement('script')
  //给polyfill
  tag.src = coolMaster.prefix + 'polyfill.min.js'
  //加载成功才回调执行next函数
  tag.onload = coolMaster.next
  //插入标签
  document.head.appendChild(tag)
} else coolMaster.next() //不是IE就可以直接执行next了
