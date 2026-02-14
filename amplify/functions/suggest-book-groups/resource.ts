import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { defineFunction } from "@aws-amplify/backend";
import { Duration } from "aws-cdk-lib";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";

const functionDir = path.dirname(fileURLToPath(import.meta.url));

export const suggestBookGroupsFunctionHandler = defineFunction(
  (scope) =>
    new Function(scope, "suggest-book-groups", {
      handler: "index.handler",
      runtime: Runtime.PYTHON_3_14,
      timeout: Duration.seconds(20),
      code: Code.fromAsset(functionDir, {
        bundling: {
          image: Runtime.PYTHON_3_14.bundlingImage,
          command: [
            "bash",
            "-c",
            [
              "pip install -r requirements.txt -t /asset-output",
              "cp -r . /asset-output"
            ].join(" && ")
          ],
        },
      }),
    }),
    {
      resourceGroupName: "auth"
    }
);
