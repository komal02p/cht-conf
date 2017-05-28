module.exports.usage = () => {
  console.log(`
# This script will update and upload all of a particular project configuration
# to a particular instance.
#
# Assumptions are made about the layout of content for a project, and these
# should not be configurable - the script is only intended for use by properly-
# structured projects.

Usage:
	$0 <projectName> <instanceUrl>
`);
};

module.exports.log = (...args) => {
  args.unshift(`[${process.argv[1]}]`);
  console.log.apply(console.log, args);
};

module.exports.big_log = (...args) => {
  module.exports.log('##', ...args);
};
