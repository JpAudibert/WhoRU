import axios from 'axios'

const api = axios.create({
  baseURL: 'http://177.44.248.78:5001/api/v1/faces',
})

export default api
