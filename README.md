# qiita_team_custom_notification

## overview

This is web application that filters [Qiita:Team](https://teams.qiita.com/) webhook by tag and notify to any slack channel.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## description

### Supported webhook events & model

- created
  - Item
  - Comment
  - Project
- updated
  - Item
  - Comment
  - Project

### Tag filtering specification

If there one or more tags with Item or Project, that matches one of tags set to this application.

## Usage

clone the repository & install dependencies

```
git clone https://github.com/jsoizo/qiita_team_custom_notification.git
cd qiita_team_custom_notification

npm i
```

set environmental variables.  

- `SLACK_WEBHOOK_URL` : [Incoming Webhook](https://api.slack.com/incoming-webhooks)URL
- `SLACK_CHANNEL` : notification channel name
- `QIITA_TEAM_TAGS` : filtering conditions(OR). This must be comma seperated values.


```
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXXXXXXXX/YYYYYYYYY/ZZZZZZZZZZZZZZZZZZZZZZZZ"
export SLACK_CHANNEL="test_channel"
export QIITA_TEAM_TAGS="any/tags,test"
```

run the application

```
npm start
```

## Run with docker

```
docker run --name qiita_team_custom_notification  -it \
  -p 3000:3000 \
  -e SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXXXXXXXX/YYYYYYYYY/ZZZZZZZZZZZZZZZZZZZZZZZZ" \
  -e SLACK_CHANNEL="test_channel" \
  -e QIITA_TEAM_TAGS="any/tags,test" \
  jsoizo/qiita_team_custom_notification
```

## Licence

[MIT](https://github.com/jsoizo/qiita_team_custom_notification/blob/master/LICENSE)

## Author

[jsoizo](https://github.com/jsoizo)
