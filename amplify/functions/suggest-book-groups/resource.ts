import { defineFunction } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';

export const suggestBookGroups = defineFunction((scope) => {
  return new lambda.Function(scope, 'SuggestBookGroupsFunction', {
    runtime: lambda.Runtime.PYTHON_3_12,
    handler: 'handler.lambda_handler',
    code: lambda.Code.fromAsset('./amplify/functions/suggest-book-groups'),
    timeout: Duration.seconds(300),
    memorySize: 512,
  });
});
