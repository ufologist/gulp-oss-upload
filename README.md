# gulp-oss-upload

A gulp plugin for uploading static file to aliyun oss(by official ali-oss sdk).

上传文件到阿里云 OSS 的 gulp 插件.

## install
`npm install gulp-oss-upload --save-dev`

## usage
```javascript
var gulp = require('gulp');
var ossUpload = require('gulp-oss-upload');

gulp.task('publish-oss', function() {
	return gulp.src("./app.js")
		       .pipe(ossUpload({
                    accessKeyId: 'your accessKeyId',
                    accessKeySecret: 'your accessKeySecret',
                    bucket: 'your bucket name',
                    rootDir: 'v1' // upload file root directory in the bucket(optional)
		        }));
});
```

This config will upload your current directory file `app.js` to `v1/app.js` in your bucket.

## optional param

### rootDir {string}
`default: ''; //root directory`

### customObjectName {function}
```javascript
/**
 * custom object name
 * 
 * @param objectName {string} default generate objectName
 * @param rootDir {string} options.rootDir
 * @param fileRelative {string} the file path relative to cwd path
 *
 * @return {string}
 */
function(objectName, rootDir, fileRelative){
	return ''
}
```