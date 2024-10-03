#!/usr/bin/env node
import * as p from "@clack/prompts";
import chalk from "chalk";
import axios from "axios";
import fs from "fs";
import path from "path";
import { Command } from "commander";
import extract from "extract-zip";
import os from "os";

const program = new Command();

program
  .name("create-spring-app")
  .description(
    "CLI tool to generate Spring Boot projects using Spring Initializr"
  )
  .version("1.0.0")
  .argument("[dir]", "Name of the directory to create", "spring-app")
  .parse(process.argv);

const createSpringProject = async (dir) => {
  const javaVersions = ["8", "11", "17", "21"];
  const bootVersions = ["2.7.13", "3.3.4"];
  const packagingOptions = ["jar", "war"];
  const dependenciesList = [
    { value: "web", label: "Spring Web" },
    { value: "data-jpa", label: "Spring Data JPA" },
    { value: "security", label: "Spring Security" },
    { value: "thymeleaf", label: "Thymeleaf" },
  ];

  try {
    // Prompt user for inputs
    const projectName = await p.text({
      message: "Project name:",
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
      message: "Java version:",
      options: javaVersions.map((version) => ({
        value: version,
        label: version,
      })),
      initialValue: "17",
    });
    const bootVersion = await p.select({
      message: "Spring Boot version:",
      options: bootVersions.map((version) => ({
        value: version,
        label: version,
      })),
      initialValue: "3.1.3",
    });
    const packaging = await p.select({
      message: "Packaging format:",
      options: packagingOptions.map((option) => ({
        value: option,
        label: option,
      })),
      initialValue: "jar",
    });
    const dependencies = await p.multiselect({
      message: "Select dependencies:",
      options: dependenciesList,
      required: false,
    });

    // Construct URL for Spring Initializr
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
    });

    // Add dependencies if selected
    if (dependencies.length > 0) {
      params.append(
        "dependencies",
        dependencies.map((dep) => dep.value).join(",")
      );
    }

    const downloadUrl = `${baseUrl}?${params.toString()}`;

    // Fetch the project
    console.log(chalk.blue("Downloading project..."));
    const response = await axios({
      method: "GET",
      url: downloadUrl,
      responseType: "stream",
    });

    // Save the zip file
    const zipPath = path.join(os.tmpdir(), `${projectName}.zip`);
    const writer = fs.createWriteStream(zipPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Extract the zip file
    console.log(chalk.blue("Extracting project..."));
    const extractDir = path.resolve(dir);
    await extract(zipPath, { dir: extractDir });

    // Cleanup: remove the ZIP file after extraction
    fs.unlinkSync(zipPath);

    console.log(
      chalk.green(
        `Project "${projectName}" created successfully in ${extractDir}`
      )
    );
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.error(
        chalk.red(
          "Error: Invalid request parameters. Please check your inputs."
        )
      );
    } else {
      console.error(chalk.red("Error creating Spring project:", error.message));
    }
  }
};

const dir = program.args[0];
createSpringProject(dir).catch((error) => {
  console.error(chalk.red("Unexpected error:", error.message));
});
