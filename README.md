# fexjs 🚀

A lightweight and powerful Fetch API wrapper with interceptors, cancel tokens, and timeout support.

[![npm](https://img.shields.io/npm/v/fex.svg)](https://www.npmjs.com/package/fexjs)
[![license](https://img.shields.io/npm/l/fex.svg)](https://github.com/gloomystore/fexjs/blob/main/LICENSE)
[![issues](https://img.shields.io/github/issues/gloomystore/fex.svg)](https://github.com/gloomystore/fex/issues)

## ✨ Features
- ✅ **Interceptors**: Request & Response hooks like Axios.
- ✅ **Timeout Support**: Automatically aborts slow requests.
- ✅ **Cancel Tokens**: Similar to Axios' `CancelToken`.
- ✅ **Base URL Support**: Define base URLs for API calls.
- ✅ **Lightweight & No Dependencies**: Uses only native `fetch`.

## Funding!
[https://github.com/sponsors/gloomystore](https://github.com/sponsors/gloomystore)


## 📦 Installation
```sh
npm install fexjs
```

## 🚀 Usage
### 🔹 **Basic GET Request**
```ts
import fex from "fexjs";

fex.get("https://jsonplaceholder.typicode.com/posts/1")
  .then((res) => console.log(res.data))
  .catch((err) => console.error(err));
```

### 🔹 **POST Request with JSON Body**
```ts
fex.post("https://jsonplaceholder.typicode.com/posts", {
  title: "New Post",
  body: "This is the content.",
  userId: 1
}).then((res) => console.log(res.data));
```

### 🔹 **Using Interceptors**
```ts
const fexInstance = fex.create({
  baseURL: "https://api.example.com",
  timeout: 5000
});

fexInstance.interceptors.request.use((config) => {
  config.headers["Authorization"] = "Bearer mytoken";
  return config;
});
```

## 📜 API Reference
### `fex.create(config)`
Creates a new instance of `fex` with custom defaults.

### `fex.get(url, config)`
Sends a GET request.

### `fex.post(url, data, config)`
Sends a POST request with a JSON body.

### `fex.options(url, config)`
Sends an OPTIONS request.

## 🛠 Development
```sh
git clone https://github.com/gloomystore/fexjs.git
cd fexjs
npm install
npm run build
```

## 📜 License
MIT © [gloomystore](https://github.com/gloomystore)