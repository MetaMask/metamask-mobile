import React, { memo } from 'react';
import { isEqual } from 'lodash';
import { v1 as random } from 'uuid';
import { safeComponentList } from './SafeComponentList';
import { ValidChildren } from './SectionShape';
import Text from '../../../component-library/components/Texts/Text';

function getElement(section) {
  const { element } = section;
  const Element = safeComponentList[element];
  if (!Element) {
    throw new Error(
      `${element} is not in the safe component list for MetaMask template renderer`,
    );
  }
  return Element;
}

const TemplateRenderer = ({ sections }) => {
  if (!sections) {
    // If sections is null eject early by returning null
    return null;
  } else if (typeof sections === 'string') {
    // React native can't render strings directly, so adding Text element
    return (
      <Text {...sections.props}>
        {typeof sections.children === 'object' ? (
          <TemplateRenderer sections={sections.children} />
        ) : (
          sections?.children
        )}
      </Text>
    );
  } else if (
    sections &&
    typeof sections === 'object' &&
    !Array.isArray(sections)
  ) {
    // If dealing with a single entry, then render a single object without key
    const Element = getElement(sections);
    return (
      <Element {...sections.props}>
        {typeof sections.children === 'object' ? (
          <TemplateRenderer sections={sections.children} />
        ) : (
          sections?.children
        )}
      </Element>
    );
  }

  // The last case is dealing with an array of objects
  return (
    <>
      {sections.reduce((allChildren, child) => {
        if (child?.hide === true) {
          return allChildren;
        }
        if (typeof child === 'string') {
          // React native can't render strings directly, so push them into the accumulator
          allChildren.push(
            <Text key={`${child}_${random()}`} {...child.props}>
              {child}
            </Text>,
          );
        } else {
          // If the entry in array is not a string, then it must be a Section.
          // Sections are handled by the main function, but must
          // be provided a key when a part of an array.
          if (!child.key) {
            throw new Error(
              'When using array syntax in MetaMask Template Language, you must specify a key for each child of the array',
            );
          }
          if (typeof child?.children === 'object') {
            // If this child has its own children, check if children is an
            // object, and in that case use recursion to render.
            allChildren.push(
              <TemplateRenderer sections={child} key={child.key} />,
            );
          } else {
            // Otherwise render the element.
            const Element = getElement(child);
            allChildren.push(
              <Element key={child.key} {...child.props}>
                {child?.children}
              </Element>,
            );
          }
        }
        return allChildren;
      }, [])}
    </>
  );
};

TemplateRenderer.propTypes = {
  sections: ValidChildren,
};

export default memo(TemplateRenderer, (prevProps, nextProps) =>
  isEqual(prevProps.sections, nextProps.sections),
);
