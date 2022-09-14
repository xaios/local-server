# 功能介绍

单个页面的内容承载量是有限的，所以经常会使用弹窗来展示更多信息，或是进行一些交互，如果与主页面的交互量大，那可能会改成侧边工具栏之类的形式以减少频繁切换弹窗状态，而如果需要展示的信息量又很大，侧边的功能就会很拥挤。

如果把功能拆分成两个页面，将浏览器的概念扩展到操作系统的视窗，弹窗与主页面都是一个标签页，也可以分成两个浏览器窗口，不需要对页面布局做什么大改动，就可以引入视窗功能，轻而易举地组合出想要的显示效果。

在同一页面中的功能是不存在数据通信问题的，如果拆分那就要考虑诸如数据同步与功能调用的问题。

跨标签页的通信通常第一想到的是借助前后端通信功能，如 `WebSocket`，不同标签页通过后端服务器转发数据，但增加了网络质量这个变数，功能拆分后效果并不太好。

现代浏览器基本上支持 [Storage Event](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/storage_event)，可以通过其实现良好的同浏览器不同标签页间的数据通信，且不需要后端协助，不需要担忧网络质量。但需要注意 storage 的同源策略限制，不过通常拆分后的页面都是同源的，并不会有什么问题。

底层通过 `localStorage` 实现，其数据上限通常只有 5MB，也不能申请独立空间，当数据量大时会影响通信功能，所以单纯使用 `localStorage` 进行数据通信，内部通过 [tiny-db](https://www.npmjs.com/package/@xaios/tiny-db) 实现数据管理。

# 基本使用

```javascript
import Server from '@xaios/local-server'

export default {
  methods: {
    // 会被连接端调用的函数，支持使用 async 或返回 Promise，其返回值（结果）将被返回给调用端
    // 此类函数如有可能抛出异常，应在函数内完成异常处理
    GetData(name, param) {
      return name
    }
  },
  mounted() {
    // 每一个实例是一条信道，分别传入数据处理主体，当前页面识别码，要连接页面的识别码
    // 数据处理主体是连接页面调用当前页面函数时的调用对象
    this.server = new Server(this, 'page A', 'page B')

    // 连接的页面双方都需要建立信道，以监听处理相关数据通信事件
    // 第四参数是可选的配置对象，分别配置断连判别时间与心跳间隔时间，分别默认是 5000 与 4000，单位毫秒
    // db name 与 version 可选，自定义配置数据管理用的 indexedDB 名与版本号
    // this.server_b = new Server(this, 'page B', 'page A', { death_time || 5000, heart_time || 4000, db_name || 'xaios_local_server', db_version || 1 })

    // 调用连接端的函数获取返回值，若函数内部抛出异常，不会返回，不会有错误事件
    // this.server_b.Request('GetData', 'name', 'param').then(data => {})

    // 销毁信道，停止相关事件监听与心跳
    // this.server.Disconnect()

    // 信道状态
    // this.server.is_alive
  }
}
```

# 事件监听

```javascript
// 信道心跳正常，功能恢复，页面默认状态应该是信道关闭，待信道建立后开始心跳，通过事件更新状态
this.db.$on('alive', e => {})

// 信道心跳丢失，功能停止，可能是必须存在的页面被关闭，需要在页面上给予相关提示，打开指定页面
// 也有可能是连接的对象因为太久没有访问，被浏览器中止了心跳，重新访问一下对应标签页就可以恢复
this.db.$on('death', e => {})

// 建立了重复的信道，通过页面识别码进行过滤的广播通信机制，如果识别码一致就会处理相关数据，页面重复不能保证数据来源
this.db.$on('repeat', () => {})

// indexedDB 发生错误
this.db.$on('error', e => {})

// 也支持自定义事件触发与监听
// this.db.$emit('', ...params)
```
