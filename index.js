// through2 is a thin wrapper around node transform streams
var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;

var OSS = require('ali-oss');

// Consts
const PLUGIN_NAME = 'gulp-oss-upload';

function getObjectName(rootDir, fileRelative) {
    var objectName = '';
    if (rootDir) {
        objectName = rootDir + '/' + fileRelative;
    } else {
        objectName = fileRelative;
    }
    return objectName;
}

// Plugin level function(dealing with files)
function gulpOssUpload(options) {
	if(!options || !options.accessKeyId || !options.accessKeySecret || !options.bucket) {
		throw new PluginError(PLUGIN_NAME, 'accessKeyId, accessKeySecret and bucket are all required!');
	}

    var rootDir = options.rootDir || '';
    var customObjectName = options.customObjectName;

    // 异步使用方式
    var client = new OSS.Wrapper(options);

    // Creating a stream through which each file will pass
    return through.obj(function(file, enc, cb) {
        if (file.isNull()) {
            // return empty file
            return cb(null, file);
        }
        if (file.isStream()) {
            return cb(new gutil.PluginError(PLUGIN_NAME, 'No stream support'));
        }

        var objectName = getObjectName(rootDir, file.relative);
        objectName = objectName.replace(/\\/g, '/');
        if (customObjectName) {
            objectName = customObjectName(objectName, rootDir, file.relative);
        }

        client.put(objectName, file.contents).then(function(result) {
            gutil.log(gutil.colors.cyan('put success'), result.name);
            cb(null, file);
            return result;
        }).catch(function(err) {
            cb(new gutil.PluginError(PLUGIN_NAME, 'ali-oss Error: ' + err.message));
        });
    });
}

// Exporting the plugin main function
module.exports = gulpOssUpload;