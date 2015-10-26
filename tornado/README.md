Tornado 性能提升方案
===================

这里主要对比几种提升 tornado 单进程性能的方案做一个横向对比。

## 测试环境
 
+ tornado 4.2.1
+  wrk 作为测试工具
+ 硬件
  + CPU：Intel® Core™ i5-4200U CPU @ 1.60GHz × 4 
  + MEM：7.7 GiB
  + 硬盘：128 GB SSD

## 测试数据

这里主要使用 wrk 开 2 个线程，并发数： 1000、2000、3000、4000、5000、6000、7000、8000、9000、10000。

## 测试开始

测试的时候，每次请求都会访问 localhost:9000 的 http 服务，为了保证这个在端口 9000 的 http 有足够的性能。

```
var http = require('http');

var server = http.createServer(function (req, res) {
  res.end('ok');
});

server.listen(9000);
```

#### Tornado Coroutine

```
import tornado.gen
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.wsgi

from tornado.httpclient import AsyncHTTPClient


class MainHandler(tornado.web.RequestHandler):

    @tornado.gen.coroutine
    def get(self):
        client = AsyncHTTPClient()
        yield client.fetch('http://localhost:9000')
        self.write("Hello, world")


def main():
    tornado.options.parse_command_line()
    application = tornado.web.Application([
        (r"/", MainHandler),
    ])
    application.listen(8888)
    tornado.ioloop.IOLoop.current().start()


if __name__ == "__main__":
    main()
```

#### Gunicorn + Tornado 

```
import tornado.gen
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.wsgi

from tornado.httpclient import HTTPClient


class MainHandler(tornado.web.RequestHandler):

    def get(self):
        client = HTTPClient()
        client.fetch('http://localhost:9000')
        self.write("Hello, world")


def main():
    application = tornado.web.Application([
        (r"/", MainHandler),
    ])
    return application

app = main()
```

```
gunicorn -k tornado -w 1 -b "0.0.0.0:8888" tornado_hello_world_1:app
```

#### Gunicorn + Tornado + Tornado Coroutine

```
import tornado.gen
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.wsgi

from tornado.httpclient import AsyncHTTPClient


class MainHandler(tornado.web.RequestHandler):

    @tornado.gen.coroutine
    def get(self):
        client = AsyncHTTPClient()
        yield client.fetch('http://localhost:9000')
        self.write("Hello, world")


def main():
    application = tornado.web.Application([
        (r"/", MainHandler),
    ])
    return application
```

```
gunicorn -k tornado -w 1 -b "0.0.0.0:8888" tornado_hello_world_1:app
```

#### Gevent Patch WSGI Server

```
from gevent import monkey
monkey.patch_all()

from gevent.wsgi import WSGIServer

import urllib2
import tornado.gen
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.wsgi


class MainHandler(tornado.web.RequestHandler):

    def get(self):
        response = urllib2.urlopen('http://localhost:9000')
        response.read()
        self.write("Hello, world")


def main():
    application = tornado.web.Application([
        (r"/", MainHandler),
    ])
    wsgi_app = tornado.wsgi.WSGIAdapter(application)
    WSGIServer(('', 8888), wsgi_app).serve_forever()

if __name__ == "__main__":
    main()
```

#### Gunicorn + Gevent Worker + Gevent Patch Tornado

```
from gevent import monkey
monkey.patch_all()

import urllib2
import tornado.gen
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.wsgi


class MainHandler(tornado.web.RequestHandler):

    def get(self):
        response = urllib2.urlopen('http://localhost:9000')
        response.read()
        self.write("Hello, world")


def main():
    application = tornado.web.Application([
        (r"/", MainHandler),
    ])
    wsgi_app = tornado.wsgi.WSGIAdapter(application)
    return wsgi_app

app = main()
```

```
gunicorn -k gevent -w 1 -b "0.0.0.0:8888" tornado_hello_world_1:app
```

测试结果在这里 https://docs.google.com/spreadsheets/d/1zT5kOcM_fxw-DDTWJyKQUHCDNh5uX3J5O2-OCYpUBsE/edit?usp=sharing