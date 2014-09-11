#! /bin/bash

cp /var/lib/jenkins/jobs/THMcards.deploy/config.xml /vagrant/puppet/files/jenkins/thmcards.deploy.config.xml
cp /var/lib/jenkins/jobs/THMcards.selenium/config.xml /vagrant/puppet/files/jenkins/thmcards.selenium.config.xml
cp /var/lib/jenkins/jobs/THMcards.jmeter/config.xml /vagrant/puppet/files/jenkins/thmcards.jmeter.config.xml
cp /var/lib/jenkins/jobs/THMcards.sonar/config.xml /vagrant/puppet/files/jenkins/thmcards.sonar.config.xml
cp /var/lib/jenkins/jobs/THMcards/config.xml /vagrant/puppet/files/jenkins/thmcards.config.xml
cp /var/lib/jenkins/config.xml /vagrant/puppet/files/jenkins/jenkins.config.xml