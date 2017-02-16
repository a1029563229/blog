var path = require('path');
var express = require('express');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var flash = require('connect-flash');
var config = require('config-lite');
var routes = require('./routes');
var pkg = require('./package');
var winston = require('winston');
var expressWinston = require('express-winston');

var app = express();

// 设置模板目录
app.set('views',path.join(__dirname,'views'));
// 设置模板引擎为 ejs
app.set('view engine','ejs');

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// session 中间件
app.use(session({
	name:config.session.key, //设置cookie中保存session id的字段名称
	secret:config.session.secret, //通过设置secret 来计算hash值并放在cookie中，使产生的signedCookie 防篡改
	cookie:{
		maxAge:config.session.maxAge //过期时间，过期后cookie中的 session id 自动删除
	},
	store:new MongoStore({ //将session存储到Mongodb
		url:config.mongodb //mongodb地址
	})
}));

// flash 中间件，用来显示通知
app.use(flash());

// 处理表单及文件上传的中间件
app.use(require('express-formidable')({
  uploadDir: path.join(__dirname, 'public/img'),// 上传文件目录
  keepExtensions: true// 保留后缀
}));

app.locals.blog = {
	title:pkg.name,
	description: pkg.description
};

app.use(function (req, res, next) {
	res.locals.user = req.session.user;
	res.locals.success = req.flash('success').toString();
	res.locals.error = req.flash('error').toString();
	next();
});

// 正常请求的日志
app.use(expressWinston.logger({
  transports: [
    new (winston.transports.Console)({
      json: true,
      colorize: true
    }),
    new winston.transports.File({
      filename: 'logs/success.log'
    })
  ]
}));
// 路由
routes(app);
// 错误请求的日志
app.use(expressWinston.errorLogger({
  transports: [
    new winston.transports.Console({
      json: true,
      colorize: true
    }),
    new winston.transports.File({
      filename: 'logs/error.log'
    })
  ]
}));

// error page
app.use(function (err, req, res, next) {
  res.render('error', {
    error: err
  });
});

app.listen(config.port, function () {
	 console.log(`${pkg.name} listening on port ${config.port}`);
});