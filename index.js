"use strict"

const http = require('http'),
      If = require('ifx'),
      querystring = require('querystring'),
      request = require('request')

class NoEnvVarExeption {
  constructor(envVarName) {
    this.message = "env var " + envVarName + " must be set."
    this.name = "NoEnvVarExeption"
  }
}

const QIITA_TEAM_WEBHOOK_MODEL = {
  "item" : "記事",
  "comment" : "コメント",
  "project" : "プロジェクト"
}
const QIITA_TEAM_WEBHOOK_ACTION = {
  "created" : "新規作成",
  "updated" : "更新"
}

const getEnvVar = (envVarName) => {
  return If(process.env[envVarName])(() => process.env[envVarName])
         .Else(() => { throw new NoEnvVarExeption(envVarName) })
}

const slackWebhookUrl = getEnvVar("SLACK_WEBHOOK_URL"),
      slackChannel = getEnvVar("SLACK_CHANNEL"),
      qiitaTeamTags = getEnvVar("QIITA_TEAM_TAGS").split(",")

// Calls incoming webhook url
const notifyToSlack = (payload, callback) => {
  const options = {
    uri: slackWebhookUrl,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }
  request.post(options, function(error, response, body) {
    if(!error && response.statusCode == 200) {
      console.log("Success to notification.")
    } else {
      console.log('Notification Error: ' + response.statusCode)
    }
    callback()
  })
}

const filterTags = (tags) => {
  const filtered = tags.filter((tag) => {
    for (const i in qiitaTeamTags) {
      if (qiitaTeamTags[i] === tag.name) {
        return true
      }
    }
    return false
  })
  return filtered
}

const createResponse = (req, res) => {
  const lookup = (decodeURI(req.url))
  console.log("[ACCESS] " + lookup)
  const returnResponse = (code, bodyObj) => {
    res.writeHead(code, {'Content-Type': 'application/json'})
    res.end(JSON.stringify(bodyObj))
  }
  if(lookup.match(/^\/qiita_team_notification$/)) {
    const body = req.body;
    const [model, action] = [body.model, body.action]
    const [tags, text, attachmentTxt] =
      If(model === "item")(() => [body.item.tags, `${QIITA_TEAM_WEBHOOK_MODEL[model]} "${body.item.title}" が${QIITA_TEAM_WEBHOOK_ACTION[body.action]}されました`, body.item.raw_body])
      .ElseIf(model === "comment")(() => [body.item.tags, `${QIITA_TEAM_WEBHOOK_MODEL["item"]} "${body.item.title}" に${QIITA_TEAM_WEBHOOK_MODEL[model]}が${QIITA_TEAM_WEBHOOK_ACTION[body.action]}されました`, body.comment.raw_body])
      .ElseIf(model === "project")(() => [body.project.tags, `${QIITA_TEAM_WEBHOOK_MODEL[model]} "${body.project.title}" が${QIITA_TEAM_WEBHOOK_ACTION[body.action]}されました`, body.project.raw_body])
      .Else(() => [undefined, undefined])
    if (text && filterTags(tags).length > 0) {
      console.log("tag mateched. notify to slack")
      notifyToSlack({
        "text" : text,
        "attachments" : [{
          "text" : attachmentTxt
        }],
        "channel" : slackChannel
      }, () => returnResponse(200, {"status" : "Success!!!"}))
    } else {
      returnResponse(200, {"status" : "Action not supported"})
    }
  } else {
    returnResponse(404, {"error" : "Not Found"})
  }
}

http.createServer((req, res) => {
  if (req.method === "POST") {
    let data = ""
    req.on("readable", function(chunk) {
      const tmp = req.read()
      data += (tmp !== null) ? tmp : ""
    })
    req.on("end", function() {
      req.body = JSON.parse(data)
      createResponse(req, res)
    })
  }
}).listen(process.env.PORT || 3000)
