#!/usr/bin/env ruby

require 'rubygems'
require 'selenium-webdriver'

driver = nil

if ENV['TRAVIS']
  browser = ENV['BROWSER'].split(':')

  caps = Selenium::WebDriver::Remote::Capabilities.send browser[0]
  caps.version = browser[1]
  caps.platform = browser[2]
  caps['tunnel-identifier'] = ENV['TRAVIS_JOB_NUMBER']
  caps['name'] = "Travis ##{ENV['TRAVIS_JOB_NUMBER']}"

  driver = Selenium::WebDriver.for(
    :remote,
    :url => "http://#{ENV['SAUCE_USERNAME']}:#{ENV['SAUCE_ACCESS_KEY']}@localhost:4445/wd/hub",
    :desired_capabilities => caps)
else
  driver = Selenium::WebDriver.for :chrome
end

def driver.wait_for_element(*args)
  how, what = extract_args(args)

  wait = Selenium::WebDriver::Wait.new(:timeout => 10) # seconds
  wait.until { find_element(how.to_sym, what).displayed? }
  find_element(how.to_sym, what)
end

driver.navigate.to "http://localhost:3000"

passed = true

# Perform role selection and log in
if not driver.find_element(:css, "span.login.btn").text.include? "About THMcards"
    print "verifyTextPresent failed"
    passed = false
end
driver.find_element(:link_text, "About THMcards").click
driver.find_element(:css, "span.glyphicon.glyphicon-chevron-right").click
driver.find_element(:css, "span.glyphicon.glyphicon-chevron-right").click
driver.find_element(:css, "button.close").click
driver.find_element(:link_text, "Legal Notice").click
driver.navigate.back


driver.quit

raise 'tests failed' unless passed
