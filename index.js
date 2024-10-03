#!/usr/bin/env node
import * as p from "@clack/prompts";
import chalk from "chalk";
import axios from "axios";
import gradient from "gradient-string";
import fs from "fs";
import path from "path";
import { Command } from "commander";
import extract from "extract-zip";
import os from "os";
import figlet from "figlet";

const program = new Command();

program
  .name("create-spring-app")
  .description(
    "CLI tool to generate Spring Boot projects using Spring Initializr"
  )
  .version("1.0.0")
  .argument("[dir]", "Name of the directory to create", "spring-app")
  .parse(process.argv);

// Function to print welcome banner
const printBanner = () => {
  const bannerText = figlet.textSync("CREATE SPRING APP", {
    font: "Standard",
    horizontalLayout: "default",
    verticalLayout: "default",
  });
  console.log(gradient.pastel.multiline(bannerText));
};

// the main function to generate the project
const createSpringProject = async (dir) => {
  printBanner();

  console.log(chalk.bold.cyan(`Welcome to Spring Boot Project Generator!`));
  console.log(chalk.green(`Let's set up your project!\n`));

  const javaVersions = [
    { value: "8", label: "Java 8" },
    { value: "11", label: "Java 11" },
    { value: "17", label: "Java 17" },
    { value: "21", label: "Java 21" },
  ];

  const bootVersions = [
    { value: "2.7.13", label: "Spring Boot 2.7.13" },
    { value: "3.3.4", label: "Spring Boot 3.3.4" },
  ];

  const packagingOptions = [
    { value: "jar", label: "JAR" },
    { value: "war", label: "WAR" },
  ];

  const dependenciesList = [
    { value: "web", label: "Spring Web" },
    { value: "data-jpa", label: "Spring Data JPA" },
    { value: "security", label: "Spring Security" },
    { value: "thymeleaf", label: "Thymeleaf" },
  ];

  // Prompt user for inputs
  const projectName = await p.text({
    message: "What will your project be called?",
    initialValue: dir,
  });
  const groupId = await p.text({
    message: "Group ID:",
    initialValue: "com.example",
  });
  const artifactId = await p.text({
    message: "Artifact ID:",
    initialValue: projectName,
  });
  const javaVersion = await p.select({
    message: "Select Java version:",
    options: javaVersions,
  });
  const bootVersion = await p.select({
    message: "Select Spring Boot version:",
    options: bootVersions,
  });
  const packaging = await p.select({
    message: "Select packaging format:",
    options: packagingOptions,
  });
  const dependencies = await p.multiselect({
    message: "Select dependencies:",
    options: dependenciesList,
  });

  const baseUrl = "https://start.spring.io/starter.zip";
  const params = new URLSearchParams({
    type: "maven-project",
    language: "java",
    bootVersion: bootVersion,
    baseDir: projectName,
    groupId: groupId,
    artifactId: artifactId,
    javaVersion: javaVersion,
    packaging: packaging,
    dependencies: dependencies.join(","),
  }).toString();

  const downloadUrl = `${baseUrl}?${params}`;

  // download project
  console.log(chalk.blue(`\nDownloading project...`));
  const response = await axios({
    method: "GET",
    url: downloadUrl,
    responseType: "stream",
  });

  // save zip folder
  const zipPath = path.join(os.tmpdir(), `${projectName}.zip`);
  const writer = fs.createWriteStream(zipPath);
  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  // extract zip folder
  const extractDir = dir ? path.resolve(dir) : process.cwd();
  console.log(chalk.blue(`Extracting project to ${extractDir}...`));

  try {
    await extract(zipPath, { dir: extractDir });
    console.log(
      chalk.green(
        `\nProject "${projectName}" created successfully in ${extractDir}`
      )
    );
  } catch (error) {
    console.error(chalk.red("Error extracting project:"), error);
  }

  // final message
  console.log(
    chalk.bold.green(
      `\nProject "${projectName}" created successfully in ${extractDir}\n`
    )
  );
  console.log(
    chalk.bold.blue(
      `To get started, navigate to your project directory and run:\n`
    )
  );
  console.log(chalk.bold.cyan(`    cd ${projectName}`));
  console.log(chalk.bold.cyan(`    ./mvnw spring-boot:run\n`));
};

// if there is an error
const dir = program.args[0];
createSpringProject(dir).catch((error) => {
  console.error(chalk.red("Error creating Spring project:", error.message));
});
