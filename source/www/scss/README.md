# Aem Scss Templates 
gulpでコンパイルして使うscssファイルテンプレートです。  

# version
ver 2.0.4 (2018/5/7)

# 考え方
コーディングスピードを上げる為に以下を気にしてコーディングする。

* クラス名は「使う場所」ではなく「スタイルの内容」をイメージできるものにする
* スタイル（クラス）はなるべく共通化して使い回す
* 毎回書いているようなものはテンプレートに入れて、次からは書かない
* 動的サイトの場合、tplとscssが連動したファイル構造を目指す

## クラス名は「使う場所」ではなく「どのような」をイメージできるものにする
よく見るのが「news-list」「schedule-list」などの名前の付け方。  
「同じ見た目だけど使う場所が違う」という理由だけで名前を付け替えている場合は、修正する度に２箇所書き換えなくてはいけないので手間がかかる。  
見た目がそれぞれ違う場合にも「schedule-list」を「movie」で使いたくなった時に違和感があり、使えなくなってしまう。

解決策としては「schedule-list」のような使用場所が固定されるような名前をつけるのではなく、「text-list」「thumb-list」「list--image」などのようにクラス自体をパーツと考えて、newsでもscheduleでもmovieでも違和感なく使えるような名前にする。

## スタイル（クラス）はなるべく共通化して使い回す
scssのコーディングを始めるとき、「ページ単位」ではなく「パーツ単位」で考える。  
基本的にはcommomやcomponentsに共通で使うことを考慮してスタイルを定義し、それを使い回す。  
共通化できないものや各ページ特有のスタイルなどはpagesディレクトリに個別ファイル（index.scss, news.scssなど）を用意し、そこに書くようにする。

## 動的サイトの場合、テンプレと連動したファイル構造を目指す
scssだけでなく、tplもなるべくパーツ化して使い回すことを考える。  
例えば、listに関することは「_list.scss」に書く、tpl側もそれを使う用の「list.tpl」を用意し、listを表示したい場合にはこのlist.tplをインクルードして使う。  
こうすればあちこちのtplに「list関係のクラス」が記述されることが防げるので、影響範囲がわかりやす。


# アンチパターン
クラスを使い回すことにより、一つのクラスを修正する際に影響する範囲が広くなります。  
その結果、対応した箇所以外の見た目が知らない間に崩れるなどの影響が起こる可能性があります。  
それを防ぐためにもここに記述するアンチパターンは使わず、管理しやすい記述を徹底してください。（これを守ったからといって他に影響がでなくなるわけではないので、影響の調査、確認は必須です）

* ブラウザ幅に応じて効かせるスタイルを変える場合
* 同じクラス名をあちこちに書かない
* 一時的な対応で詳細度を上げたり!importantを使って、スタイルを上書きしない
* スタイルを変更するためにクラスを付け足さない

## ブラウザ幅に応じて効かせるスタイルを変える場合
今までは以下のようにmedia queryごとにクラスに効くスタイルを定義していましたが、これだと「.box」という記述があちこちに重複し、管理しづらいのでやめる。また「sp.scss」「tb.scss」などを作ってmedia queryごとに読み込みを変えることも同じことなのでやらない。
~~~
// アンチパターン

.box {
    // 共通
}

@media screen and (max-width: 768px) {
    .box {
        // タブレットサイズ以下
    }
}

@media screen and (max-width: 480px) {
    .box {
        // スマホサイズ
    }
}
~~~
上記を解決するために、mixin.scssに定義した「mq-l」「mq-m」「mq-s」を使う。  
これを使えばブラウザ幅に応じたスタイルを「.box」クラスのスコープ内に定義できるので、同じクラス名をあちこちに書かなくて済む。  
~~~
// ベストプラクティス

.box {
    // 共通

    @include mq-l() {
        // PCサイズのみ
    }
    
    @include mq-m() {
        // タブレットサイズのみ
    }

    @include mq-s() {
        // スマホサイズのみ
    }
}
~~~

## 同じクラス名をあちこちに書かない
上記でも説明したように、あちこちに「.box」というクラスが書かれていると修正する際に影響範囲がわかりづらくなる。  
「.box」のことはこのファイルに書く！と決めたらその他の箇所には絶対書かない。
~~~
// アンチパターン

* common.scss
.box {
    color: red;
}

* header.scss
.box {
    color: blue;
}
~~~
意識をすれば同じものをあちこちに書かないようにはできますが、名前が単純だと気づかないうちに上書きしてしまうこともあるかもしれないので気をつける。
新しくクラスを定義するときは、一意になるような命名をする。
~~~
// ベストプラクティス

* box.scss
.box {
    color: red;
}

* common.scss
.common-box {
    color: green;
}

* header.scss 
.header-box {
    color: blue;
}
~~~

## 一時的な対応で詳細度を上げたり!importantを使って、スタイルを上書きしない
上書き合戦になり、使っているのかいないのかわからない定義が残り、管理できなくなるのでやらない。
~~~
// アンチパターン

// 例）基本.boxは赤文字だけど、div配下の時だけ緑色にして、.font-blueというクラスが付いている時だけ青色にしたい...

* scss
.box {
    color: red;
    font-size: 12px;
}

div .box {
    color: green;
}

.box.font-blue {
    color: blue !important;
}

* html
<div class="box">box</div> //-> 赤文字
<div>
    <div class="box">box</div> //-> 緑文字
</div>
<div class="box font-blue">box</div> //-> 青文字
~~~
これだとどのクラスについたスタイルがいつ効いているのかわかりづらい。  
そもそも「親が〇〇ならこのスタイル」や「〇〇というクラスが付いている時だけこのスタイル」などの指定をすると他の人が修正するときに理解しづらく、ミスをおこしやすくなる。  
他にも、後からHTMLタグを変えづらくなったり、詳細度を気にしなくてはいけないので修正に時間がかかる。  

それを解決するためにも、「このクラスをつけたらこのスタイルになる」という単純なルールが徹底していれば管理しやするなる。  
BEMを使えば以下のように同じスタイルを持った、少しだけ違うクラスを定義できるので、「ここだけ違うスタイルにしたい」という場合にもそれ用のクラスにして対応する。
~~~
// ベストプラクティス

* scss
.box {
    $this: &; //-> .boxを変数に保存
    color: red;
    font-size: 12px;

    // 緑にしたい時はこっちをつかう
    &--green { //-> .box--green
        @extend #{$this}; //-> .boxのスタイルを継承
        color: green; //-> このスタイル以外は全て.boxと同じ
    }

    // 青くしたい時はこっちをつかう
    &--blue { //-> .box--blue
        @extend #{$this}; //-> .boxのスタイルを継承
        color: blue; //-> このスタイル以外は全て.boxと同じ
    }
}

* html
<div class="box">box</div> //-> 赤文字
<div>
    <div class="box--green">box</div> //-> 緑文字
</div>
<a>
    <div class="box--blue">box</div> //-> 青文字
</a>
~~~

## スタイルを変更するためにクラスを付け足さない
既にスタイルの効いているものに別のクラスをもう１つ付けて、スタイルを変更しない。
~~~
// アンチパターン

.box {
    width: 200px;

    &.w100 {
        width: 100px;
    }
}

<div class="box">box</div>
<div class="box w100">box</div>
~~~
これは先ほどのBEMのやり方で対応できる。
~~~
// ベストプラクティス

.box {
    $this: &;
    width: 200px;

    &--100 {
        @extend #{$this};
        width: 100px;
    }
}

<div class="box">box</div>
<div class="box--100">box</div>
~~~
「.box」が付いていたものをJSで処理したい（していた）場合にはうまく行かなくなってしますが、そもそもJSで処理したいものには「js-box」のようなJSで判別するようのクラスをつけるべきなので問題ない。（js-boxに見た目のベースとなるようなスタイルは効かせない）
~~~
<div class="js-box box">box</div>
<div class="js-box box--100">box</div>
<div class="js-box box--200">box</div>
<div class="js-box box--400">box</div>
~~~

# ディレクトリ構造の解説
たくさんあってわかりづらいので、ディレクトリの意味とその中のファイルをいくつか解説します。  
※ 各ファイル内にもコメントが書いてあるので、それを見れば何用のファイルなのかわかると思います。

~~~
scss
 ├ common       # 共通設定、定義などのファイル群
 ├ components   # 共通パーツのファイル群
 ├ modules      # 外部プラグインなどのファイル群
 ├ pages        # 各ページ個別のファイル群
 └ main.scss    # コンパイル対象ファイル
~~~

## commonディレクトリ
サイト全体の構成、設定、定義をまとめる。
* variables.scss
    * サイト共通の変数定義。ブレイクポイント、カラー、フォント、イージングなどを定義
* reset.scss, normalize.scss
    * スタイルの初期化。resetもnormalizeも用意してあるので好きなものを使う
* base.scss
    * タグに直接スタイルを効かせる
* parts.scss
    * 付けるだけで動くクラスの定義。「mb-30」「al-c」「c-red」など
* mixins.scss
    * 便利機能をまとめる。「clearfix」やmedia queryを簡単に呼び出す「mq-s」「mq-m」「mq-l」も用意してます

## componentsディレクトリ
サイト全体で共通するパーツごとにスタイルをまとめる。
* common.scss
    * ページを構成するためのパーツ。「wrapper」「inner」など、
* headar.scss, footer.scss
    * 文字通り。「header」「footer」など
* format.scss
    * format.phpで定義するスタイル。「btn-100」「list」「main-title」など 
* post-entry
    * 管理画面からの入力値などに効かせたいスタイル 。「aem-post」など
* movie
    * youtube、ミルビーなどの動画を扱うスタイル
* hover
    * ホバーの挙動はここにクラスとして定義し、使いたいところで「@extend」して使いたい。
* sns
    * snsアイコンを表示するメニューなどのスタイル

## modulesディレクトリ
外部プラグインで使うcssなどを突っ込んでおく。  
* accordion.scss
    * aemプラグインのアコーディオンで使う。これをimportしても見た目は変わらない

## pagesディレクトリ
各ページごとに独立するスタイル  
* top.scss
    * トップページにのみ登場するスタイルを定義

* その他ページに合わせて以下のようなファイルをつくるとわかりやすいかも
    * news.scss
    * schedule.scss
    * movie.scss
    * gallery.scss
    * discography.scss
    * biography.scss
    * profile.scss
    * releace.scss
    * blog.scss
    * goods.scss
    * mypage.scss
    * memberscard.scss
    * mailmagazine.scss
    * regist.scss
    * contact.scss
    * special.scss
