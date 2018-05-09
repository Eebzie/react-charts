import React, { Component } from 'react'
//
import { withConsumer } from '../utils/Context'
import { Animate } from './ReactMove'
import Selectors from '../utils/Selectors'
import Utils from '../utils/Utils'

const lineBackgroundColor = 'rgba(38, 38, 38, 0.3)'
const backgroundColor = 'rgba(38, 38, 38, 0.9)'

class Cursor extends Component {
  static defaultProps = {
    render: ({
      axis, value, datum, primary,
    }) => (
      <span>
        {axis.vertical
          ? typeof value !== 'undefined'
            ? axis.format(axis.stacked && !primary ? datum.totalValue : value)
            : ''
          : typeof value !== 'undefined'
            ? axis.format(axis.stacked && !primary ? datum.totalValue : value)
            : ''}
      </span>
    ),
    snap: true,
    showLine: true,
    showLabel: true,
    axisID: undefined,
    onChange: () => {},
  }
  static isHtml = true
  prevValue = null
  componentDidMount () {
    this.updateCursor()
  }
  componentDidUpdate (prev) {
    if (
      Utils.shallowCompare(prev, this.props, [
        'pointer',
        'stackData',
        'primaryAxes',
        'secondaryAxes',
      ])
    ) {
      this.updateCursor()
    }
  }
  updateCursor = () => {
    const {
      primary,
      snap,
      axisID,
      onChange,
      //
      cursor,
      stackData,
      primaryAxes,
      secondaryAxes,
      pointer,
      hovered,
      gridWidth,
      gridHeight,
      dispatch,
    } = this.props

    // Don't render until we have all dependencies
    if (!stackData || !primaryAxes.length || !secondaryAxes.length) {
      return null
    }

    // Determine the axis to use
    const axis = Utils.getAxisByAxisID(primary ? primaryAxes : secondaryAxes, axisID)
    const siblingAxis = primary ? secondaryAxes[0] : primaryAxes[0]

    let { value = null, datum } = cursor || {}
    let x
    let y
    let show = false

    // Resolve the invert function
    const invert = axis.scale.invert || (d => d)

    // If the cursor isn't in the grid, don't display
    if (pointer.active) {
      // Default to cursor x and y
      show = true
      x = pointer.x
      y = pointer.y

      if (
        pointer.x < -1 ||
        pointer.x > gridWidth + 1 ||
        pointer.y < -1 ||
        pointer.y > gridHeight + 1
      ) {
        show = false
      }

      // Implement snapping
      if (axis.type === 'ordinal' || snap) {
        // For snapping we need the hovered datums
        if (!hovered || !hovered.datums || !hovered.datums.length) {
          return
        }

        datum = Utils.getClosestPoint(pointer, hovered.datums)

        if (axis.vertical) {
          // Vertical snapping
          y = datum.focus.y
        } else {
          // Horizontal snapping
          x = datum.focus.x
        }
      }

      // Get value and label
      if (axis.vertical) {
        value = invert(y)
      } else {
        value = invert(x)
      }
    } else {
      show = false
      datum = {}
    }

    const newCursor = {
      axis,
      siblingAxis,
      value: show ? value : null,
      datum,
    }

    onChange(newCursor)

    dispatch(state => ({
      ...state,
      cursors: {
        ...state.cursors,
        [primary ? 'primary' : 'secondary']: newCursor,
      },
    }))
  }
  render () {
    const {
      showLine,
      showLabel,
      value: manualValue,
      primary,
      snap,
      //
      cursor,
      offset: { left, top },
      gridX,
      gridY,
      gridWidth,
      gridHeight,
      render,
      children,
      Component: Comp,
    } = this.props

    if (!cursor) {
      return null
    }

    const {
      axis, siblingAxis, value, datum,
    } = cursor

    // Is the value manually set via the value prop?
    const isManual = typeof manualValue !== 'undefined'
    // Resolve the value from manual or the cursor info
    let resolvedValue = isManual ? manualValue : value
    // Should we animate?
    const animated = snap || axis.type === 'ordinal'

    // Get the sibling range
    const siblingRange = siblingAxis.scale.range()

    // Set the opacity
    let opacity = Utils.isValidPoint(resolvedValue) ? 1 : 0

    // Fall back to the last value for coordinates
    resolvedValue = Utils.isValidPoint(resolvedValue) ? resolvedValue : this.prevValue

    // Store the latest valid resolvedValue
    if (Utils.isValidPoint(resolvedValue)) {
      this.prevValue = resolvedValue
    }

    let x
    let y
    let x1
    let x2
    let y1
    let y2
    let alignPctX
    let alignPctY

    // Vertical alignment
    if (axis.vertical) {
      y = axis.scale(resolvedValue)
      x1 = siblingRange[0]
      x2 = siblingRange[1]
      y1 = y - 1
      y2 = y + 1
      if (axis.position === 'left') {
        alignPctX = -100
        alignPctY = -50
      } else {
        alignPctX = 0
        alignPctY = -50
      }
    } else {
      x = axis.scale(resolvedValue)
      x1 = x - 1
      x2 = x + 1
      y1 = siblingRange[0]
      y2 = siblingRange[1]
      if (axis.position === 'top') {
        alignPctX = -500
        alignPctY = -100
      } else {
        alignPctX = -50
        alignPctY = 0
      }
    }

    // If the cursor isn't in the grid, don't display
    if (x < -1 || x > gridWidth + 1 || y < -1 || y > gridHeight + 1) {
      opacity = 0
    }

    const renderProps = {
      axis,
      datum,
      value: resolvedValue,
      primary,
    }

    const lineStartX = Math.min(x1, x2)
    const lineStartY = Math.min(y1, y2)
    const lineEndX = Math.max(x1, x2)
    const lineEndY = Math.max(y1, y2)
    const bubbleX = x1 + (!axis.vertical ? 1 : 0)
    const bubbleY = y1 + (axis.vertical ? 1 : 0)

    const lineHeight = Math.max(lineEndY - lineStartY, 0)
    const lineWidth = Math.max(lineEndX - lineStartX, 0)

    const start = {
      lineStartX,
      lineStartY,
      lineWidth,
      lineHeight,
      bubbleX,
      bubbleY,
      opacity: 0,
    }

    const update = {}
    Object.keys(start).forEach(key => {
      update[key] = [start[key]]
    })
    update.opacity = [opacity]

    let renderedChildren

    if (Comp) {
      renderedChildren = React.createElement(Comp, null, renderProps)
    } else {
      renderedChildren = (render || children)(renderProps)
    }

    return (
      <Animate show={opacity} start={start} enter={update} update={update} leave={update}>
        {inter => (
          <div
            className="Cursor"
            style={{
              pointerEvents: 'none',
              position: 'absolute',
              left: `${left + gridX}px`,
              top: `${top + gridY}px`,
              opacity: inter.opacity,
            }}
          >
            {primary && String(isManual)}
            {primary && String(resolvedValue)}
            {/* Render the cursor line */}
            {showLine ? (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: `translate3d(${animated ? inter.lineStartX : lineStartX}px, ${
                    animated ? inter.lineStartY : lineStartY
                  }px, 0px)`,
                  width: `${animated ? inter.lineWidth : lineWidth}px`,
                  height: `${animated ? inter.lineHeight : lineHeight}px`,
                  background: lineBackgroundColor,
                  WebkitBackfaceVisibility: 'hidden',
                }}
              />
            ) : null}
            {/* Render the cursor bubble */}
            {showLabel ? (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: `translate3d(${animated ? inter.bubbleX : bubbleX}px, ${
                    animated ? inter.bubbleY : bubbleY
                  }px, 0px)`,
                }}
              >
                {/* Render the cursor label */}
                <div
                  style={{
                    padding: '5px',
                    fontSize: '10px',
                    background: backgroundColor,
                    color: 'white',
                    borderRadius: '3px',
                    position: 'relative',
                    transform: `translate3d(${alignPctX}%, ${alignPctY}%, 0px)`,
                    whiteSpace: !axis.vertical && 'nowrap',
                  }}
                >
                  {renderedChildren}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Animate>
    )
  }
}

export default withConsumer(() => {
  const selectors = {
    primaryAxes: Selectors.primaryAxes(),
    secondaryAxes: Selectors.secondaryAxes(),
    offset: Selectors.offset(),
    gridHeight: Selectors.gridHeight(),
    gridWidth: Selectors.gridWidth(),
    gridX: Selectors.gridX(),
    gridY: Selectors.gridY(),
  }
  return (state, props) => ({
    stackData: state.stackData,
    pointer: state.pointer,
    cursor: state.cursors[props.primary ? 'primary' : 'secondary'],
    hovered: state.hovered,
    primaryAxes: selectors.primaryAxes(state),
    secondaryAxes: selectors.secondaryAxes(state),
    offset: selectors.offset(state),
    gridHeight: selectors.gridHeight(state),
    gridWidth: selectors.gridWidth(state),
    gridX: selectors.gridX(state),
    gridY: selectors.gridY(state),
  })
})(Cursor)
