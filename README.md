# CloudWatch Alerts -> Google Chat Space

This project implements a workflow to transform CloudWatch Alerts into Google Chat Cards v2 messages and sent them to a Google Chat Space.

It is called "SNS to Google Chat Space" beause technically any SNS message can be transformed and the intention is to add more templates in the future to apply transformations to different message types, but for now, only CloudWatch Alerts templates are supported.

**NOTE: _Currently_ there are no Lambda functions used. EventBridge Pipes orchestrates the workflow and the transformations are done via Input Transforms in Pipes instead of processing via a Lambda. This limits the transformations to simple field mappings from source message to destination fields but means there is basically $0 for this flow unless you have a lot of messages going through it (which would make for a very noisey Google CHat Space!).**

## How to use this repo...

This repository generates a CloudFormation template using the AWS CDK. You can choose to either:

* deploy the project directly via the AWS CDK
* use the output CloudFormation template to deploy without the CDK

The project supports both CDK context configuration properties or CloudFormation Parameters to define the configuration. Decide which one you want to use based upon (primarily) if you want to generate a template you can reuse and decide on the config when you deploy it, or if you want to script up the deployment in a CI/CD process. E.g. maybe you don't want to initialize an AWS Account with CDK deployment permissions so you generate and save the CloudFormation template to use whenever you need it.

## Configuration

This project supports defining configuration in a `cdk.context.json` file or using CloudFormation Parameters as the configuration source. Each config property can be defined in either location and you can mix and match them. E.g. maybe you want to generate a tempalte that has the same Message title & icon but deploy it with different spaces. You can define the title & icon in the CDK Contet and leave the space definition as CloudFormation parameters (e.g. for when you want to deploy the template on dev vs prod and just change the channel the messages are sent to).

E.g. `cdk.context.json`

```json
 {
  "GoogleChatConfig": {
   "MessageTitle": "ProjectA",
   "MessageIcon": "https://projecta.com/favicon.png",
   "Space": {
     "Label": "ProjectA_Alerts",
     "Endpoint": "https://chat.googleapis.com/v1/spaces/AAAAeusufh7/messages?key=AIzaSyDkq&token=sdidfd
   }
 }
 ```

These values can also be set in a flat context structure in `cdk.context.json`:

```json
 {
   "GoogleChatMessageTitle": "ProjectA",
   "GoogleChatMessageIcon": "https://projecta.com/favicon.png",
   "GoogleChatSpaceLabel": "ProjectA_Alerts",
   "GoogleChatSpaceEndpoint": "https://chat.googleapis.com/v1/spaces/AAAAeusufh7/messages?key=AIzaSyDkq&token=sdidfd
 }
```

These values can be provided as parameters in the stack when you deploy (e.g. `cdk deploy --parameters GoogleChatMessageTitle=ProjectA`).

These values can also be set as Context values on the cdk command line (e.g. `cdk synth --context GoogleChatMessageTitle=ProjectA`).

Any configuration defined in the CDK context (`cdk.context.json` or on the command line) supresses the CloudFormation Parameters for those config items (since you already defined the values, you don't need CloudFormation Parameters as well).

## Message Flow

1. CloudWatch Alert generates an Alert and you should choose an SNS Topic as the Action for this Alert. You can use an existing topic or have this stack create one for you.
2. SNS cannot be directly used as a source for EventBridge Pipes (ugh...) so there is an intermediary SQS Queue created that is subscribed to the SNS Topic and is then used as the source for events for the EventBridge Pipe
   * note: SNS -> SQS subscription is set to `rawMessageDelivery` so that the SNS message wrapper is not included in the message.
3. The SQS message body contains the escaped JSON string of the raw CloudWatch Alerts message. EventBridge Pipes can unescape and parse the body for you so the template references are `<$.body.FIELD>` to reference a `FIELD` of the CloudWatch Alarm data. This is delivered to the Pipe as the Source message.
4. The Input Transformation is applied to generate the final JSON payload that is actually sent to the Api Destination.

### Debugging Tips

* Subscribe to the SNS Topic with your email address as Email-JSON to get the same JSON data that is in the SQS body sent to you via email. This is helpful to get some sample data for testing.
* Edit the EventBridge Pipe to enable CloudWatch Logs and turn on trace logging for the Pipe. You will see all the steps of the pipe, the input data, the transformed data, and responses back from the Api Destination - SUPER helpful for debugging issues.
  * note: you will need to modify the Role used by the EventBridge Pipe to allow it to write to CloudWatch Logs.
  * note: make sure to disable the logging once you have solved your issue as it can generate a LOT of logs that cost $$ in CloudWatch to ingest and store.
* use the [UI Kit Builder](https://addons.gsuite.google.com/uikit/builder) from Google to play around with your transformations to get the right formatting. You can leave the `<$.body.FIELD>` codes in the JSON to make copy-paste between the UI Kit Builder and the files in this project easy.

## Known Limitations

* EventBridge Pipes does not let you use HTML inside your input transformer because it detects the `< ... >` as a field definition. This is **NOT documented** in the EventBridge Pipes documentation and the EventBridge Pipes Web UX will show the correct output transform applied when you have HTML in the template but you will not be able to save the input transformer or deploy it. The main impact of this is that Google Chat relies on HTML for basic text formatting (vs Slack that lets you use markdown) so you cannot include a [TextParagraph](https://developers.google.com/workspace/chat/api/reference/rest/v1/cards#textparagraph) with formatting.
* EventBridge Pipes supports using Lambda functions as custom code handlers within the Pipe flow but this project does not currently have support for defining Lambda functions and using them in this flow. This is intentional to keep the project simple and the output self-contained to a single CloudFormation template.
  * Future Enhancement: allow inline Lambda functions to be defined with simple code that is embedded in the template for deployment.

## Technology Used/Required

* Node v20.9+
* TypeScript 5.4+
* AWS CDK v2
* AWS JavaScript SDK v3
* [cdk-nag](https://github.com/cdklabs/cdk-nag)

### AWS Services Used

* SNS
* SQS
* EventBridge Pipes

### TODOs

* add Jest tests
