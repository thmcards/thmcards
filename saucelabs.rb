#!/usr/bin/env ruby

Dir.glob("tests/selenium-ruby/*.rb") do |rb_file|
    puts "working on: #{rb_file}..."
    load rb_file
end