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
driver.wait_for_element(:class, "text-muted").click

if not driver.wait_for_element(:tag, "h2").text.include? "Impressum"
    print "verifyTextPresent failed"
    passed = false
end

driver.quit

raise 'tests failed' unless passed
