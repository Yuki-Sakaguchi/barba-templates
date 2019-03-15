// 共通プラグイン
const gulp = require('gulp');
const glob = require('glob');
const plumber = require('gulp-plumber');

// 開発モード
const gulpMode = require('gulp-mode')({
    modes: ['production', 'development'],
    default: 'development',
    verbose: false,
});

// パス
const path = {
    source: __dirname,
    public: __dirname.replace(/(\/|\\)source/, ''),
};

/**
 * pugをコンパイル
 */
gulp.task('pug', () => {
    const pug = require('gulp-pug');

    return gulp.src(`${path.source}/pug/pages/**/*.pug`)
        .pipe(plumber({ errorHandler: errorPlumber }))
        .pipe(pug({
            pretty: '    ', // コンパイル時のインデントを4スペースに変更
        }))
        .pipe(gulp.dest(path.public));
});

/**
 * scssをコンパイルし、postCSSでブレフィックスを付与する
 * 開発モードがdevelopmentの場合のみ、ソースマップを書き出す
 */
gulp.task('scss', () => {
    const sass = require('gulp-sass');
    const postcss = require('gulp-postcss');
    const cssmini = require('gulp-minify-css');
    const sourcemaps = require('gulp-sourcemaps');
    const supportBrowser = '> 0.5% in JP';
    const postcssPlugins = [
        require('autoprefixer')(supportBrowser), // ベンダープレフィックスの付与
        require('postcss-sorting'), // プロパティの順番をソート
    ];

    return gulp.src(`${path.source}/scss/**/*.scss`)
        .pipe(plumber({ errorHandler: errorPlumber }))
        .pipe(gulpMode.development(sourcemaps.init()))
        .pipe(sass({ outputStyle: 'expanded' }))
        .pipe(gulpMode.development(sourcemaps.write({ includeContent: false })))
        .pipe(gulpMode.development(sourcemaps.init({ loadMaps: true })))
        .pipe(postcss(postcssPlugins))
        .pipe(gulpMode.production(cssmini({ advanced: false })))
        .pipe(gulpMode.development(sourcemaps.write()))
        .pipe(gulp.dest(`${path.public}/css`));
});

/**
 * webpackでTypeScriptをコンパイルする
 * 設定はwebpack.config.jsに書いてあるのでそっちを参照
 */
gulp.task('ts', () => {
    const webpackStream = require('webpack-stream');
    const webpack = require('webpack');
    const webpackConfig = require('./ts/webpack.config');

    // コンパイル対象を複数にしたいのでファイルを正規表現で取得
    // アンダーバー(_)始まりではない、tsファイルは全て対象
    const entries = {};
    glob.sync(`${path.source}{!(_)*.ts,/**/!(_)*.ts}`).map(file => {
        if (file.indexOf('@types') != -1) return false;
        // 型定義ファイル以外が対象
        const fileName = file.replace(`${__dirname}/ts/`, '').replace('.ts', '');
        entries[fileName] = file;
    });

    // 動的に値を設定
    webpackConfig.entry = entries;
    webpackConfig.output.path = `${path.public}/js`;
    webpackConfig.mode = gulpMode.production() ? 'production' : 'development';
    if (gulpMode.development()) webpackConfig.devtool = 'inline-source-map';

    return webpackStream(webpackConfig, webpack).on('error', function (e) {
            this.emit('end');
        })
        .pipe(gulp.dest(`${path.public}/js`));
});

/**
 * JavaScriptファイルをまとめてミニファイする
 * 処理したファイルは`bundle.min.js`という名前で書き出す
 */
gulp.task('js-bundle', () => {
    const concat = require('gulp-concat');
    const uglify = require('gulp-uglify');

    return gulp.src(`${path.source}/js/**/*.js`)
        .pipe(plumber({ errorHandler: errorPlumber }))
        .pipe(concat('bundle.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest(`${path.public}/js/`))
});

/**
 * 画像を圧縮する
 * 対象はjpg, png
 */
gulp.task('imagemin', () => {
    const imagemin = require('gulp-imagemin');
    const pngquant = require('imagemin-pngquant');
    const mozjpeg = require('imagemin-mozjpeg');
    const changed = require('gulp-changed');

    return gulp.src(`${path.source}/images/**/*.{png,jpg,jpeg}`)
        .pipe(changed(`${path.public}/images/`))
        .pipe(imagemin([
            pngquant({
                quality: '65-80',
                speed: 1,
                floyd: 0,
            }),
            mozjpeg({
                quality: 85,
                progressive: true,
            })
        ], {
            verbose: true,
        }))
        .pipe(imagemin()) // 余計なメタ情報を削除
        .pipe(gulp.dest(`${path.public}/images/`));
});

/**
 * ローカルにwebサーバを立ち上げる
 * localhost:8000でアクセスできるようになります。
 */
gulp.task('webserver', () => {
    const webserver = require('gulp-webserver');
    
    return gulp.src(path.public)
        .pipe(webserver({
            directoryListing: {
                enable: true,
                path: path.public,
            }
        }));
});

/**
 * ファイルの修正を監視
 */
gulp.task('watch', () => {
    gulp.watch(`${path.source}/pug/**/*.pug`, ['pug']);
    gulp.watch(`${path.source}/scss/**/*.scss`, ['scss']);
    gulp.watch(`${path.source}/ts/**/*.ts`, ['ts'])
});

/**
 * build
 * pug, scss, tsタスクを全て実行
 */
gulp.task('build', ['pug', 'scss', 'ts']);

/**
 * all
 * コンパイル系のコマンドを全て実行する
 */
gulp.task('all', ['pug', 'scss', 'ts', 'js-bundle', 'imagemin']);

/**
 * webサーバを立ち上げ、ファイルの修正を監視する
 */
gulp.task('default', ['webserver', 'watch']);

/**
 * plumberでのエラーハンドリング
 */
function errorPlumber (e) {
    console.log(e.messageFormatted);
    this.emit('end');
}
