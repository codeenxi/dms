import React, { Component } from "react";
import PropTypes from "prop-types";
import ImageZoom from "react-medium-image-zoom";
import axios from "axios";

import { shouldRender, setState, sign } from "../../utils";
import constants from "../../constants";

function addNameToDataURL(dataURL, name) {
  return dataURL.replace(";base64", `;name=${name};base64`);
}

function processFile(file) {
  const { name, size, type } = file;
  return new Promise((resolve, reject) => {
    const reader = new window.FileReader();
    reader.onerror = reject;
    reader.onload = event => {
      resolve({
        dataURL: addNameToDataURL(event.target.result, name),
        name,
        size,
        type,
      });
    };
    reader.readAsDataURL(file);
  });
}

function processFiles(files) {
  return Promise.all([].map.call(files, processFile));
}

function FilesInfo(props) {
  const { filesInfo, values } = props;
  const arrayData = values[0] ? values : filesInfo;
  return (
    <ul className="file-info">
      {arrayData.map((value, key) => {
        return (
          <li
            key={key}
            style={{
              display: "flex",
              width: "250px",
              flexDirection: "column",
            }}>
            <span>
              <ImageZoom
                image={{
                  src: value || "",
                  alt: "",
                  className: "file-image",
                  style: { width: "200px", margin: "5px" },
                }}
                zoomImage={{
                  src: value || "",
                  alt: "",
                }}
                defaultStyles={{
                  overlay: {
                    backgroundColor: "rgb(0, 0, 0, 0.7)",
                  },
                }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

class FileWidget extends Component {
  constructor(props) {
    super(props);
    const { value } = props;
    const values = Array.isArray(value) ? value : [value];
    // 直接使用url地址
    this.state = { values, filesInfo: values };
  }

  shouldComponentUpdate(nextProps, nextState) {
    return shouldRender(this, nextProps, nextState);
  }

  componentDidMount() {
    this.forceUpdate();
  }

  onChange = async event => {
    const { multiple, onChange } = this.props;
    const files = event.target.files;
    const filesInfo = await processFiles(event.target.files);
    const auth = await sign();
    const fileValue = await Promise.all(
      await filesInfo.map(async (fileInfo, i) => {
        const form = new FormData();
        form.append("resource", files[i]);
        const res = await axios({
          method: "POST",
          url: `${constants.uploadBaseUrl}/putFileByPath`,
          headers: {
            token: auth.data,
            "Content-Type": "multipart/form-data",
          },
          data: form,
        });
        return res.data.data;
      })
    );
    const state = {
      values: fileValue,
      filesInfo,
    };
    setState(this, state, () => {
      if (multiple) {
        onChange(state.values);
      } else {
        onChange(state.values[0]);
      }
    });
  };

  render() {
    const { multiple, id, readonly, disabled, autofocus } = this.props;
    const { filesInfo, values } = this.state;
    return (
      <div>
        <p>
          <input
            ref={ref => (this.inputRef = ref)}
            id={id}
            type="file"
            disabled={readonly || disabled}
            onChange={this.onChange}
            defaultValue=""
            autoFocus={autofocus}
            multiple={multiple}
          />
        </p>
        <FilesInfo filesInfo={filesInfo} values={values} />
      </div>
    );
  }
}

FileWidget.defaultProps = {
  autofocus: false,
};

if (process.env.NODE_ENV !== "production") {
  FileWidget.propTypes = {
    multiple: PropTypes.bool,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string),
    ]),
    autofocus: PropTypes.bool,
  };
}

export default FileWidget;
