const DB = require('@xaios/tiny-db')

const KEY_HEART = 'xaios_local_server_heart'
const KEY_REQUEST = 'xaios_local_server_request'
const KEY_RESPONSE = 'xaios_local_server_response'

module.exports = class {
  _is_alive = false
  _event_hub = {}
  _store_request = {}

  get is_alive() {
    return this._is_alive
  }

  set is_alive(is_alive) {
    this._is_alive != is_alive && this.$emit(is_alive ? 'alive' : 'death')
    this._is_alive = is_alive
  }

  constructor(host, s_id, t_id, option = {}) {
    this._db = new DB('xaios_local_server')
    this._db.$on('error', e => this.$emit('error', e))

    this._host = host
    this._s_id = s_id
    this._t_id = t_id

    this._heart_time = option.heart_time || 4000
    this._death_time = option.death_time || 5000

    window.addEventListener('storage', this._Server)

    this._DeathTime()
    this._HeartBeat()
    this._heart_timer = setInterval(() => this._HeartBeat(), this._heart_time)
  }

  _Server = e => {
    let key = e.key
    if (key != KEY_RESPONSE && key != KEY_REQUEST && key != KEY_HEART) return

    e = JSON.parse(e.newValue.trim() || '{}')

    if (e.s_id == this._s_id && e.t_id == this._t_id) this.$emit('repeat')
    if (e.s_id != this._t_id || e.t_id != this._s_id) return

    this.is_alive = true

    if (key == KEY_HEART)
      this._DeathTime()
    else if (key == KEY_REQUEST)
      this._db.Get(`${key}_${e.id}`).then(async data => {
        let result = this._host[e.api](...data)
        if (result instanceof Promise)
          result = await result

        this._Request(KEY_RESPONSE, { id: e.id, s_id: this._s_id, t_id: this._t_id }, result)
      })
    else if (this._store_request[e.id])
      this._db.Get(`${key}_${e.id}`).then(data => {
        this._store_request[e.id](data)
        delete this._store_request[e.id]
      })
  }

  _HeartBeat() {
    this._Request(KEY_HEART, { s_id: this._s_id, t_id: this._t_id, time: Date.now() })
  }

  _DeathTime() {
    clearTimeout(this._death_timer)
    this._death_timer = setTimeout(() => this.is_alive = false, this._death_time)
  }

  async _Request(key, params, data) {
    if (key != KEY_HEART)
      await this._db.Set(`${key}_${params.id}`, data, Date.now() + 600000)

    localStorage[key] = JSON.stringify(params)
  }

  Request(api, ...data) {
    return new Promise(resolve => {
      let id = Date.now() + Math.floor(Math.random() * Math.random() * 1000000)
      this._store_request[id] = resolve
      this._Request(KEY_REQUEST, { id, s_id: this._s_id, t_id: this._t_id, api }, data)
    })
  }

  Disconnect() {
    this.is_alive = false
    clearInterval(this._heart_timer)
    window.removeEventListener('storage', this._Server)
  }

  $on(name, handle) {
    this._event_hub[name] = this._event_hub[name] || []
    this._event_hub[name].push(handle)
  }

  $emit(name, ...params) {
    this._event_hub[name]?.forEach(handle => handle(...params))
  }
}
