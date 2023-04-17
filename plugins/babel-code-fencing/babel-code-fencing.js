const startComment = 'BEGIN:ONLY_INCLUDE_IN_FLASK';
const endComment = 'END:ONLY_INCLUDE_IN_FLASK';

// eslint-disable-next-line import/no-commonjs
module.exports = function () {
  return {
    visitor: {
      Program(path) {
        let insideFlaskBlock = false;
        // Declare an array to store the new body of the program after removing nodes
        const newBody = [];

        path.node.body.forEach((node) => {
          // Check if the current node has leading comments
          if (node.leadingComments) {
            // Iterate through the leading comments of the current node
            node.leadingComments.forEach((comment, index) => {
              if (comment.value.includes(startComment)) {
                insideFlaskBlock = true;
              } else if (comment.value.includes(endComment)) {
                insideFlaskBlock = false;

                // Remove the end comment
                node.leadingComments.splice(index, 1);
                return;
              }
            });
          }
          // If the current node is not inside the block to be removed, add it to the new body
          if (!insideFlaskBlock) {
            newBody.push(node);
          }
        });

        // Replace the program body with the new body after removing the nodes
        path.node.body = newBody;
      },
    },
  };
};
