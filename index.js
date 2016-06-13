"use strict"

// requirements
const http = require('http'),
      If = require('ifx'),
      querystring = require('querystring'),
      request = require('request'),
      deepEqual = require('deep-equal'),
      _ = require('lodash')

// QiitaTeamのモデル名と日本語モデル名のマッピング
const QIITA_TEAM_WEBHOOK_MODEL = {
  "item" : "記事",
  "comment" : "コメント",
  "project" : "プロジェクト"
}

// QiitaTeamのWebhook動作と日本語名のマッピング
const QIITA_TEAM_WEBHOOK_ACTION = {
  "created" : "新規作成",
  "updated" : "更新"
}

// 環境変数が設定されていない場合の例外クラス
class NoEnvVarExeption {
  constructor(envVarName) {
    this.message = "env var " + envVarName + " must be set."
    this.name = "NoEnvVarExeption"
  }
}

// QiitaTeamのTagモデル
class QiitaTeamTag {
  constructor(name) {
    this.name = name;
  }
  equal(qiitaTag) {
    return deepEqual(this, qiitaTag)
  }
}

// 環境変数を取得する関数
const getEnvVar = (envVarName) => {
  return If(process.env[envVarName])(() => process.env[envVarName])
         .Else(() => { throw new NoEnvVarExeption(envVarName) })
}

// 設定として環境変数を読み込む
const slackWebhookUrl = getEnvVar("SLACK_WEBHOOK_URL"),
      slackChannel = getEnvVar("SLACK_CHANNEL"),
      validQiitaTeamTags = getEnvVar("QIITA_TEAM_TAGS").split(",").map((s) => new QiitaTeamTag(s))

// Slackを呼ぶ
// TODO Promise化したい
const notifyToSlack = (payload, callback) => {
  const options = {
    uri: slackWebhookUrl,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }
  request.post(options, function(error, response, body) {
    if(!error && response.statusCode == 200) {
      console.info("Success to notification.")
    } else {
      console.info('Notification Error: ' + response.statusCode)
    }
    callback()
  })
}

const returnResponse = (res, code, bodyObj) => {
  res.writeHead(code, {'Content-Type': 'application/json'})
  res.end(JSON.stringify(bodyObj))
}

// Main
// TODO このあたり非同期化して責務ハッキリさせたい
// bodyの中だけをここで処理する感じが理想
const main = (req, res) => {
  const lookup = (decodeURI(req.url))
  console.info("[ACCESS] " + lookup)
  if(lookup.match(/^\/qiita_team_notification$/)) {
    // TODO 非常に汚い, なんとかしたい
    const body = req.body;
    const [model, action] = [body.model, body.action]
    const [tags, text, attachmentTxt] =
      If(model === "item")(() => [body.item.tags.map((s) => new QiitaTeamTag(s.name)), `${QIITA_TEAM_WEBHOOK_MODEL[model]} "${body.item.title}" が${QIITA_TEAM_WEBHOOK_ACTION[body.action]}されました`, body.item.raw_body])
      .ElseIf(model === "comment")(() => [body.item.tags.map((s) => new QiitaTeamTag(s.name)), `${QIITA_TEAM_WEBHOOK_MODEL["item"]} "${body.item.title}" に${QIITA_TEAM_WEBHOOK_MODEL[model]}が${QIITA_TEAM_WEBHOOK_ACTION[body.action]}されました`, body.comment.raw_body])
      .ElseIf(model === "project")(() => [body.project.tags.map((s) => new QiitaTeamTag(s.name)), `${QIITA_TEAM_WEBHOOK_MODEL[model]} "${body.project.title}" が${QIITA_TEAM_WEBHOOK_ACTION[body.action]}されました`, body.project.raw_body])
      .Else(() => [undefined, undefined, undefined]) // ありえないけどifx的都合でこうしてる
    const validTags = _.flatMap(validQiitaTeamTags, (validTag) => {
      return tags.filter((tag) => tag.equal(validTag))
    })
    if (validTags.length > 0) {
      console.info("tag mateched. notify to slack")
      notifyToSlack({
        "text" : text,
        "attachments" : [{
          "text" : attachmentTxt
        }],
        "channel" : slackChannel
      }, () => returnResponse(res, 200, {"message" : "Success!!!"}))
    } else {
      returnResponse(res, 200, {"message" : "Invalid Tag"})
    }
  } else {
    returnResponse(res, 404, {"error" : "Not Found"})
  }
}

// Boot HTTP server
http.createServer((req, res) => {
  if (req.method === "POST") {
    let data = ""
    req.on("readable", function(chunk) {
      const tmp = req.read()
      data += (tmp !== null) ? tmp : ""
    })
    req.on("end", function() {
      req.body = JSON.parse(data)
      main(req, res)
    })
  } else {
    returnResponse(res, 405, {"error" : "Method Not Allowed"})
  }
}).listen(process.env.PORT || 3000)
