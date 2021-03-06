# 静态资源自动化发布方案

* *v1.1.0 2016-8-16* 全量发布引入 gulp-changed 只操作修改过的文件, 可作为全量中的增量机制
* *v1.0.0 2016-8-15* 全量发布和增量发布的机制

通过自动化工具将静态资源上传到(生产)服务器(例如: OSS), 以下方案中都以 [OSS](https://intl.aliyun.com/zh/product/oss) 为例.

## 全量发布

一般小型前端开发团队对静态资源的发布处理比较少, 开发时和发布时都是源码形式, 这样或多或少让人觉得不专业(性能那当然也是有点影响的). 

**因此我们可以换个思路, 本地开发时仍采用源码(CSS/JS)形式, 但在上传到 OSS 前做压缩(min)处理来提升前端性能.**

这样的处理方式对开发人员的要求是最低的(对他们来说这个过程是透明的), 他们可以在写代码时放心地添加注释, 到最后发布到生产服务器时再统统压缩掉.

考虑下我们在发布前对前端源码的处理方式有
* css-min
* uglify(js)
* image-min

因此我们自动化发布方案的思路如下

1. 全量文件列表(一般是一整个静态资源目录)
2. 压缩 JS 文件
3. 压缩 CSS 文件
4. ... 压缩其他文件, 例如图片等等
5. 将文件上传到 OSS

实现方式, gulp 任务(在静态资源目录下执行), 可以通过配置 npm scripts 来使用, `"publish": "gulp publish-oss"`, 即 npm run publish

下面是 `gulpfile.js` 的具体实现

```javascript
var gulp = require('gulp');
var gulpFilter = require('gulp-filter');
var gulpChanged = require('gulp-changed');
var gulpCssmin = require('gulp-cssmin');
var gulpUglify = require('gulp-uglify');
var gulpOssUpload = require('gulp-oss-upload');

// 这里设置你要上传的文件
var src = [
    '*/**' // 当前目录下的所有文件和文件夹
];
// 这里设置你要排除的文件
var ignore = [
    '!./node_modules{,/**}', // 排除一整个文件夹
    '!./gulpfile.js',
    '!./package.json'
];

var ossOptions = {
    accessKeyId: '配置你的 accessKeyId',
    accessKeySecret: '配置你的 accessKeySecret',
    bucket: '配置你的 bucket 名称',
    region: '配置你的 bucket region'
};

// 通过 gulpChanged 只操作修改过的文件, 如果要强制上传所有文件, 可以删掉 DEST 的目录
var DEST = './.tmp';

gulp.task('publish-oss', function() {
    var jsFilter = gulpFilter(['**/*.js', '!**/*{.,-}min.js'], {restore: true});
    var cssFilter = gulpFilter(['**/*.css', '!**/*{.,-}min.css'], {restore: true});

    return gulp.src(src.concat(ignore))
               // 执行过一次全量更新后, 后续只操作修改过的文件
               .pipe(gulpChanged(DEST))
               // 项目中使用源码形式, 上传到 OSS 前做 min 处理
               // 处理 JS 文件
               .pipe(jsFilter)
               .pipe(gulpUglify())
               .pipe(jsFilter.restore)
               // 处理 CSS 文件
               .pipe(cssFilter)
               .pipe(gulpCssmin())
               .pipe(cssFilter.restore)
               // ... 你还可以添加其他处理, 例如 autoprefixer, imagemin 等等
               // 配合 gulpChanged 来使用
               .pipe(gulp.dest(DEST))
               // 最终完成静态资源的上传
               .pipe(gulpOssUpload(ossOptions));
});
```

## 增量发布

在全量发布的原理上, 我们也可以实现对应的增量发布机制, 将一个增量文件列表中的文件上传到 OSS.

可以配合 [SVN 获取此次版本发布时经历了哪些文件修改](https://www.douban.com/note/497853339/), 以此作为增量发布的文件列表.

实现方式, gulp 任务(在静态资源目录下执行)

下面是 `gulpfile.js` 的具体实现

```javascript
var fs = require('fs');
var gulp = require('gulp');
var gulpOssUpload = require('gulp-oss-upload');

/**
 * 这里是 changedfiles-static.txt 的示例文件内容
 * 
 * -------------------------------------------
 * A https://192.168.198.18/static/dir1/file.css
 * M https://192.168.198.18/static/dir1/img/file.png
 * 
 * A https://192.168.198.18/static/dir2/**
 * -------------------------------------------
 * 
 * 如果发布单个文件的就列出单个文件即可,
 * 如果发布整个目录, 就在目录后面加上 "/**" 例如上面的 dir2/**
 */
var svnChangedFiles = 'changedfiles-static.txt';
// 将 URL 替换成本地文件的相对路径, 即上面 SVN 文件列表中的 URL 如何映射到本地目录
// 例如 SVN URL 为: https://192.168.198.18/static/dir1/file.css
// 你本地的目录为 static/dir1/file.css
// 那么就应该修改下面的 svnUrl = 'https://192.168.198.18/static';
// 上传文件时, 文件的路径就替换成了 ./dir1/file.css
var svnUrl = 'https://192.168.198.18/static';

// 这里设置你要上传的文件
var src = [];
// 这里设置你要排除的文件
var ignore = [
    '!./node_modules{,/**}', // 排除一整个文件夹
    '!./gulpfile.js',
    '!./package.json'
];

/**
 * 获取 svn 更新文件列表
 * 
 * @param svnChangedFiles {string}
 * @return {string[]}
 */
function getSvnChangedFiles(svnChangedFiles) {
    var content = fs.readFileSync(svnChangedFiles, {encoding: 'utf-8'});
    var fileList = content.match(/http\S+/gi);
    fileList = fileList.map(function(fileUrl) {
        return fileUrl.replace(svnUrl, '.');
    });
    return fileList;
}

src = src.concat(getSvnChangedFiles(svnChangedFiles));
src.forEach(function(file, index) {
    console.log(index + 1, file);
});

var ossOptions = {
    accessKeyId: '配置你的 accessKeyId',
    accessKeySecret: '配置你的 accessKeySecret',
    bucket: '配置你的 bucket 名称',
    region: '配置你的 bucket region'
};

gulp.task('publish-oss', function() {
    return gulp.src(src.concat(ignore), {base: '.'})
               .pipe(gulpOssUpload(ossOptions));
});
```