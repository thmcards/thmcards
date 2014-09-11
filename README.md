# ARSnova Flashcards

ARSnova Flashcards is a digital recreation of a classic learning tool. The service offers students a modern and intuitive access to one of the most successful proven learning methods. THMcards is being developed as a modern Single Page Application.

## Getting Started

The most convenient way to get started developing ARSnova Flashcards is by using
our [Vagrant](http://www.vagrantup.com/) environment, found at
[thm-projects/arsnova-flashcards](https://github.com/thm-projects/arsnova-flashcards).
Use your IDE on your host machine to make changes to ARSnova Flashcards, while the build
process is completely handled by the Vagrant box. You will not need to install
any development tools.

[arsnova-flashcards](https://github.com/thm-projects/arsnova-flashcards) sets up a
virtual machine for both development and production use. The basic usage is
`vagrant up`, which will start the development environment. If you wish to start
production as well, use `vagrant up production`.

Once any machine has been started, all required ARSnova repositories are
automatically cloned from GitHub, so that you can start coding immediately.

To connect to your development machine, type `vagrant ssh`. After that, you can
start ARSnova Flashcards inside the machine by running `./start.sh`. You can then access
ARSnova Flashcards from your host machine by opening http://localhost:3000.

### QA Private Build

[arsnova-flashcards](https://github.com/thm-projects/arsnova-flashcards) also sets up
the build environment we use internally at THM, which consists of
[Jenkins](http://jenkins-ci.org/) and [SonarQube](http://www.sonarqube.org/).
The former provides a QA pipeline that builds, tests, analyzes, and finally
deploys ARSnova Flashcards to the production environment. SonarQube is used for the
analyzation phase and provides a drill-down into many quality aspects, including
[technical debt](https://en.wikipedia.org/wiki/Technical_debt).

While the development environment is running, Jenkins and SonarQube are
available at:

- http://localhost:9000 (SonarQube)
- http://localhost:9090 (Jenkins)

### QA Public Build

We also leverage the cloud provided by [Travis CI](https://travis-ci.org/) and
[Sauce Labs](https://saucelabs.com/) to build and test ARSnova Flashcards. Travis first
builds and unit tests the software, then it instructs Sauce Labs to run smoke
tests on different browsers and operating systems. This ensures that the basic
features of ARSnova work across browsers and platforms. See
[this example](https://saucelabs.com/tests/4beecf8c754f418da0b75259c039c077) to
get an idea.

Our official build status provided by Travis CI:

- [![Build Status](https://travis-ci.org/thm-projects/arsnova-flashcards.svg?branch=master)](https://travis-ci.org/thm-projects/arsnova-flashcards) for ARSnova Flashcards

## Credits

ARSnova Flashcards is powered by Technische Hochschule Mittelhessen - University of Applied Sciences.
