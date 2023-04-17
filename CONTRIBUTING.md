# Contributing
Thanks for helping out!

This project is intended to run on a Google Sheet, and makes heavy use of the Google Apps Script APIs. You will need
  some dependencies and tooling to build, test, and deploy the code.

# Getting Started
After cloning this repo, download and install the latest version of Node for your operating system:
* [NodeJS](https://nodejs.org/en)

Then install dependencies with `npm install`

# Pipeline
This project is written in Typescript, which will be transpiled to Google "gscript" during the deployment process. We use Webpack to build our Typescript code into a bundle that google can understand. After that build step, we use the google tool [Clasp](https://developers.google.com/apps-script/guides/clasp) (brought in as a project dependency) to actually handle deployment to the Google Sheet. 

To build/deploy the code:
1. Login to clasp with your Google credentials by running `npx clasp login`
2. Build the bundle with `npm run build`
3. Deploy with `npx clasp push`
